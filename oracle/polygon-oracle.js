import WebSocket from 'ws';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Api, JsonRpc } from 'eosjs';
// eslint-disable-next-line import/extensions
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js'; // development only

import Web3 from 'web3';
// eslint-disable-next-line import/extensions
import symbolToEthAddressMap from './eos-token-map.js';

dotenv.config();

// eslint-disable-next-line no-console
const LOG = console.log;
// eslint-disable-next-line no-console
const ERROR = console.error;
const wsEndpoint = process.env.POLYGON_WS_ENDPOINT;
const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS;
const claimedTopic =
  '0xce3bcb6e219596cf26007ffdfaae8953bc3f76e3f36c0a79b23e28020da3222e';
const sentTopic =
  '0x0af9a96d5eab584bc97107a072072e71ae2353e7fa0ad649f0a7bb5b542e0877';
const eosOracle = process.env.ORACLE_EOS_ACCOUNT;
const polygonOracle = process.env.ORACLE_POLYGON_ADDRESS;
const eosContractAccount = process.env.EOS_CONTRACT_ACCOUNT;

const web3 = new Web3();

const ws = new WebSocket(wsEndpoint, {
  createConnection: ({}, (error, socket) => LOG({ error, socket })),
});

const logSubscription = {
  jsonrpc: '2.0',
  id: 1,
  method: 'eth_subscribe',
  params: [
    'logs',
    {
      address: contractAddress,
      topics: [[claimedTopic, sentTopic]],
    },
  ],
};

const signatureProvider = new JsSignatureProvider([
  process.env.ORACLE_EOS_PRIVATE_KEY,
]);
const rpc = new JsonRpc(process.env.EOS_API_ENDPOINT, { fetch }); // required to read blockchain state
const api = new Api({ rpc, signatureProvider }); // required to submit transactions

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
  api
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
  api
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

const amountToWaxQuantity = (tokenAmount, tokenAddress) => {
  const tokenInfo = symbolToEthAddressMap[tokenAddress];
  const amount = tokenAmount / `1e${tokenInfo.polygonDecimals}`;
  return `${amount.toFixed(4)} ${tokenInfo.account}`;
};

ws.on('open', () => {
  LOG('Connection Established!', {
    eosOracle,
    polygonOracle,
    contractAddress,
    claimedTopic,
    sentTopic,
    logSubscription,
  });
  ws.send(JSON.stringify(logSubscription));
});

ws.on('message', (rawData) => {
  const json = JSON.parse(rawData);
  LOG(JSON.stringify(json));
  if (!json?.params?.result) {
    return;
  }
  const { topics, data } = json?.params?.result;
  LOG({ topics, data });
  // eslint-disable-next-line no-unused-vars
  const [topic, ...topicParams] = topics;
  if (topic === claimedTopic) {
    const [id, toAddress, tokenAddress] = topicParams;
    claimed({
      id: parseInt(id, 16),
      toAddress: toAddress.replace('0x', ''),
      quantity: amountToWaxQuantity(
        parseInt(data, 16),
        web3.eth.abi.decodeParameter('address', tokenAddress)
      ),
    });
  } else if (topic === sentTopic) {
    const [id, tokenAddress, toAddress] = topicParams;
    const [chainId, amount] = web3.eth.abi.decodeParameter(
      { ParentStruct: { propertyOne: 'uint8', propertyTwo: 'uint256' } },
      data
    );
    const toAccountParsed = web3.utils
      .hexToAscii(toAddress)
      .split('')
      .filter((a) => a !== '\x00')
      .join('');
    received({
      id: web3.eth.abi.decodeParameter('uint64', id),
      toAccount: toAccountParsed,
      chainId,
      quantity: amountToWaxQuantity(
        amount,
        web3.eth.abi.decodeParameter('address', tokenAddress)
      ),
    });
  }
});

ws.on('error', (error) => {
  ERROR(error);
});
