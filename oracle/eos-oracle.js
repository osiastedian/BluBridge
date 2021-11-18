import WebSocket from 'ws';
import { Api, JsonRpc } from 'eosjs';
import fetch from 'node-fetch';
import Web3 from 'web3';
import { createDfuseClient } from '@dfuse/client';
// eslint-disable-next-line import/extensions
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js'; // development only
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// eslint-disable-next-line import/extensions
import symbolToEthAddressMap from './eos-token-map.js';

dotenv.config();

const bridgeContract = process.env.EOS_CONTRACT_ACCOUNT;
const logsendAction = 'logsend';
const signAction = 'sign';
const oracleAccount = process.env.ORACLE_EOS_ACCOUNT;

const web3 = new Web3(process.env.POLYGON_API_ENDPOINT);

const account = web3.eth.accounts.privateKeyToAccount(
  process.env.ORACLE_POLYGON_PRIVATE_KEY
);

const signatureProvider = new JsSignatureProvider([
  process.env.ORACLE_EOS_PRIVATE_KEY,
]);
const rpc = new JsonRpc(process.env.EOS_API_ENDPOINT, { fetch }); // required to read blockchain state
const api = new Api({ rpc, signatureProvider }); // required to submit transactions

global.fetch = fetch;
global.WebSocket = WebSocket;

// eslint-disable-next-line no-console
const LOG = console.log;
// eslint-disable-next-line no-console
const ERROR = console.error;

const dfuseClientOptions = {
  apiKey: process.env.DFUSE_API_KEY,
  network: process.env.DFUSE_NETWORK,
};

LOG('CONFIG:', {
  ethAddress: account.address,
  dfuseClientOptions,
  polygonApiEndpoint: process.env.POLYGON_API_ENDPOINT,
});

const registerSignature = (id, signature) => {
  LOG(`Register Signature: ${id}, ${signature}`);
  return api.transact(
    {
      actions: [
        {
          account: bridgeContract,
          name: signAction,
          authorization: [
            {
              actor: oracleAccount,
              permission: 'active',
            },
          ],
          data: {
            id,
            signature,
            oracle_name: oracleAccount,
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
      propertyTwo: web3.utils.toBN(web3.utils.toWei(`${amount}`, 'ether')).toString(),
      propertyThree: chainId,
      propertyFour: tokenAddress,
      propertyFive: toAddress,
    }
  );
  const hashed = web3.utils.sha3(encoded);
  LOG(`Generating Signature for: ${hashed}`);
  const { signature } = account.sign(hashed);
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

const cursorPath = path.resolve(`${oracleAccount}-cursor.txt`);
const saveCursor = (cursor) => {
  if (fs.existsSync(cursorPath)) {
    fs.rmSync(cursorPath);
  }
  fs.writeFileSync(cursorPath, cursor);
};

const run = async () => {
  const client = createDfuseClient(dfuseClientOptions);

  LOG(`Starting EOS Oracle: ${oracleAccount}`);
  let cursor = `${fs.existsSync(cursorPath) && fs.readFileSync(cursorPath)}`;
  await client.graphql(
    streamTransfer,
    (message, stream) => {
      if (message.type === 'error') {
        ERROR('An error occurred', message.errors, message.terminal);
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

          const token = symbolToEthAddressMap[symbol];

          const parsedData = {
            id,
            chainId,
            toAddress: toAddress.replace('000000000000000000000000', '0x'),
            amount,
            tokenAddress: token.address,
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
      }
    },
    {
      variables: {
        query: `receiver:${bridgeContract} action:${logsendAction}`,
        cursor,
        limit: 10,
        irreversibleOnly: true,
      },
    }
  );
};

run().catch(ERROR);
