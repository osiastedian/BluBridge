import WebSocket from 'ws';
import { Api, JsonRpc } from 'eosjs';
import fetch from 'node-fetch';
import Web3 from 'web3';
import { createDfuseClient } from '@dfuse/client';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// eslint-disable-next-line import/extensions
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js'; // development only
// eslint-disable-next-line import/extensions
import symbolToEthAddressMap from './eos-token-map.js';

global.fetch = fetch;
global.WebSocket = WebSocket;

// eslint-disable-next-line no-console
const LOG = console.log;
// eslint-disable-next-line no-console
const ERROR = console.error;
const logsendAction = 'logsend';
const signAction = 'sign';
const POLYGON_CHAIN_ID = 2;
const BSC_CHAIND_ID = 3;

dotenv.config();

const name = process.env.ORACLE_NAME;
const eosContractAccount = process.env.EOS_CONTRACT_ACCOUNT;
const eosOracle = process.env.EOS_ORACLE_ACCOUNT;

const privateKeyMap = {
  [POLYGON_CHAIN_ID]: process.env.POLYGON_ORACLE_PRIVATE_KEY,
  [BSC_CHAIND_ID]: process.env.BSC_ORACLE_PRIVATE_KEY
}
const eosApiEndpoint = process.env.EOS_API_ENDPOINT;

const web3 = new Web3();
const signatureProvider = new JsSignatureProvider([
  process.env.EOS_ORACLE_PRIVATE_KEY,
]);

const rpc = new JsonRpc(eosApiEndpoint, { fetch }); // required to read blockchain state
const api = new Api({ rpc, signatureProvider }); // required to submit transactions

const dfuseClientOptions = {
  apiKey: process.env.DFUSE_API_KEY,
  network: process.env.DFUSE_NETWORK,
};

const registerSignature = (id, signature) => {
  LOG(`Register Signature: ${id}, ${signature}`);
  return api.transact(
    {
      actions: [
        {
          account: eosContractAccount,
          name: signAction,
          authorization: [
            {
              actor: eosOracle,
              permission: 'active',
            },
          ],
          data: {
            id,
            signature,
            oracle_name: eosOracle,
          },
        },
      ],
    },
    {
      blocksBehind: 3,
      expireSeconds: 30,
    }
  );
};

const generateEthSignature = (transferData) => {
  const { id, amount, chainId, tokenAddress, toAddress } = transferData;
  const encoded = web3.eth.abi.encodeParameter(
    {
      ParentStruct: {
        propertyOne: 'uint64', // id
        propertyTwo: 'uint256', // amount
        propertyThree: 'uint8', // chainId
        propertyFour: 'address', // tokenAddress
        propertyFive: 'address', // toAddress
      },
    },
    {
      propertyOne: id,
      propertyTwo: web3.utils
        .toBN(web3.utils.toWei(`${amount}`, 'ether'))
        .toString(),
      propertyThree: chainId,
      propertyFour: tokenAddress,
      propertyFive: toAddress,
    }
  );
  const hashed = web3.utils.sha3(encoded);
  LOG(`Generating Signature for: ${hashed}`);
  const { signature } = web3.eth.accounts.sign(hashed, privateKeyMap[chainId])
  return signature;
};

const streamTransfer = `subscription ($query: String!, $cursor: String, $limit: Int64) {
  searchTransactionsForward(query: $query, limit: $limit, cursor: $cursor) {
    undo
    cursor
    trace {
      block {
        num
        id
        confirmed
        timestamp
        previous
      }
      id
      matchingActions {
        account
        name
        json
        seq
        receiver
      }
    }
  }
}

`;

const cursorPath = path.resolve(`${eosOracle}-cursor.txt`);
const saveCursor = (cursor) => {
  if (fs.existsSync(cursorPath)) {
    fs.rmSync(cursorPath);
  }
  fs.writeFileSync(cursorPath, cursor);
};

const client = createDfuseClient(dfuseClientOptions);

LOG('Oracle Setup:', {
  name,
  eosOracle,
  eosContractAccount,
  eosApiEndpoint,
  dfuseClientOptions,
  symbolToEthAddressMap
});
let cursor = `${fs.existsSync(cursorPath) && fs.readFileSync(cursorPath)}`;

client.graphql(
  streamTransfer,
  (message, stream) => {    
    if (message.type === 'error') {
      ERROR('An error occurred', message.errors, message.terminal);
      process.kill(process.pid);
    }

    if (message.type === 'data') {
      const rawData = message.data.searchTransactionsForward;
      const actions = rawData.trace.matchingActions;
      cursor = rawData.cursor;

      actions.forEach((action) => {
        const { quantity, to_address: toAddress } = action.json;
        const { id } = action.json;
        const chainId = action.json.chain_id;
        const [amount, symbol] = quantity.split(' ');

        const tokenAddress = symbolToEthAddressMap[symbol][chainId];

        const parsedData = {
          id,
          chainId,
          toAddress: toAddress.replace('000000000000000000000000', '0x'),
          amount,
          tokenAddress,
        };
        LOG('Received Sent:', parsedData);
        const signature = generateEthSignature(parsedData);
        registerSignature(id, signature)
          .then((result) => LOG('Successful sign: \n', result))
          .then(() => saveCursor(cursor));
      });

      stream.mark({ cursor: rawData.cursor });
    }

    if (message.type === 'complete') {
      LOG('Stream completed');
      process.kill(process.pid);
    }
  },
  {
    variables: {
      query: `receiver:${eosContractAccount} action:${logsendAction}`,
      cursor,
      limit: 10,
      irreversibleOnly: true,
    },
  }
);
