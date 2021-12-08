import Web3 from 'web3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Api as EOSApi, JsonRpc as EOSJsonRpc } from 'eosjs';
// eslint-disable-next-line import/extensions
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js'; // development only
// eslint-disable-next-line import/extensions
import symbolToEthAddressMap from './eos-token-map.js';

dotenv.config();

// eslint-disable-next-line no-console
const LOG = console.log;
// eslint-disable-next-line no-console
const ERROR = console.error;
const name = process.env.ORACLE_NAME;
const eosOracle = process.env.EOS_ORACLE_ACCOUNT;
const eosOraclePrivateKey = process.env.EOS_ORACLE_PRIVATE_KEY;
const eosApiEndpoint = process.env.EOS_API_ENDPOINT;
const eosContractAccount = process.env.EOS_CONTRACT_ACCOUNT;

const ethBridgeAbiPath = process.env.ETH_BRIDGE_ABI_PATH;
const ethWeb3WebsocketUri = process.env.ETH_WEBSOCKET_URI;
const ethBridgeContractAddress = process.env.ETH_CONTRACT_ADDRESS;
const ethFromBlock = process.env.FROM_BLOCK ?? 'latest';

const signatureProvider = new JsSignatureProvider([eosOraclePrivateKey]);
const rpc = new EOSJsonRpc(eosApiEndpoint, { fetch }); // required to read blockchain state
const eosApi = new EOSApi({ rpc, signatureProvider }); // required to submit transactions

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(ethWeb3WebsocketUri)
);
const bridgeAbi = JSON.parse(fs.readFileSync(path.resolve(ethBridgeAbiPath)));
const bridge = new web3.eth.Contract(bridgeAbi.abi, ethBridgeContractAddress);

const claimed = ({ id, toAddress, quantity }) => {
  const claimedAction = {
    account: eosContractAccount,
    name: 'claimed',
    authorization: [
      {
        actor: eosOracle,
        permission: 'active',
      },
    ],
    data: {
      oracle_name: eosOracle,
      id,
      to_eth: toAddress,
      quantity,
    },
  };
  LOG('Claiming:  ', claimedAction);
  eosApi
    .transact(
      {
        actions: [claimedAction],
      },
      {
        blocksBehind: 3,
        expireSeconds: 30,
      }
    )
    .then((fulfilledData) => {
      LOG('Claimed: ', fulfilledData);
    })
    .catch((error) => {
      ERROR('Claimed ERROR: ', error);
    });
};

const amountToWaxQuantity = (tokenAmount, tokenAddress) => {
  const tokenInfo = symbolToEthAddressMap[tokenAddress];
  const amount = tokenAmount / `1e${tokenInfo.decimals}`;
  return `${amount.toFixed(4)} ${tokenInfo.account}`;
};

const received = ({ id, toAccount, chainId, quantity }) => {
  const receivedAction = {
    account: eosContractAccount,
    name: 'received',
    authorization: [
      {
        actor: eosOracle,
        permission: 'active',
      },
    ],
    data: {
      id,
      to_account: toAccount,
      chain_id: chainId,
      quantity,
      oracle_name: eosOracle,
    },
  };
  LOG('Receiving:  ', receivedAction);
  eosApi
    .transact(
      {
        actions: [receivedAction],
      },
      {
        blocksBehind: 3,
        expireSeconds: 30,
      }
    )
    .then((fulfilledData) => {
      LOG('Received: ', fulfilledData);
    })
    .catch((error) => {
      ERROR('Received ERROR: ', error);
    });
};

const handleSentEvent = (values) => {
  LOG('[SENT] Event received:', values);
  const { id, tokenAddress, toAddress, toChainId, amount } = values;

  const toAccountParsed = web3.utils
    .hexToAscii(toAddress)
    .split('')
    .filter((a) => a !== '\x00')
    .join('');
  received({
    id,
    toAccount: toAccountParsed,
    chainId: toChainId,
    quantity: amountToWaxQuantity(amount, tokenAddress),
  });
};

const handleClaimedEvent = (values) => {
  LOG('[CLAIMED] Event received:', values);
  const { id, toAddress, tokenAddress, amount } = values;
  LOG({ id, toAddress, tokenAddress, amount });
  claimed({
    id,
    quantity: amountToWaxQuantity(amount, tokenAddress),
    toAddress,
  });
};

const run = () =>
  new Promise((_, reject) => {
    bridge.events
      .Sent({
        fromBlock: ethFromBlock,
      })
      .on('connected', () => {
        LOG('[SENT] event subcription established!');
      })
      .on('data', (data) => {
        handleSentEvent(data.returnValues);
      })
      .on('error', (error) => {
        ERROR('[SENT] Event error:', error);
        reject(error);
      });
    bridge.events
      .Claimed({
        fromBlock: ethFromBlock,
      })
      .on('connected', () => {
        LOG('[CLAIMED] event subcription established!');
      })
      .on('data', (data) => {
        handleClaimedEvent(data.returnValues);
      })
      .on('error', (error) => {
        ERROR('[CLAIMED] Event error:', error);
        reject(error);
      });
  });

LOG('Oracle Setup:', {
  name,
  eosOracle,
  eosContractAccount,
  eosApiEndpoint,
  ethBridgeContractAddress,
  ethWeb3WebsocketUri,
});
run();
