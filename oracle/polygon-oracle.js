import WebSocket from 'ws';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Api, JsonRpc } from 'eosjs';
// eslint-disable-next-line import/extensions
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig.js'; // development only
// eslint-disable-next-line import/extensions
import symbolToEthAddressMap from './eos-token-map.js';

dotenv.config();

// eslint-disable-next-line no-console
const LOG = console.log;
// eslint-disable-next-line no-console
const ERROR = console.error;
const wsEndpoint = process.env.POLYGON_WS_ENDPOINT;
const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS;
const claimedTopic = process.env.POLYGON_CONTRACT_CLAIMED_TOPIC;
const eosOracle = process.env.ORACLE_EOS_ACCOUNT;
const polygonOracle = process.env.ORACLE_POLYGON_ADDRESS;
const eosContractAccount = process.env.EOS_CONTRACT_ACCOUNT;

const ws = new WebSocket(wsEndpoint, {
  createConnection: ({}, (error, socket) => LOG({ error, socket })),
});

const eventSubscription = {
  jsonrpc: '2.0',
  id: 1,
  method: 'eth_subscribe',
  params: [
    'logs',
    {
      address: contractAddress,
      topics: [claimedTopic],
    },
  ],
};

const signatureProvider = new JsSignatureProvider([
  process.env.ORACLE_EOS_PRIVATE_KEY,
]);
const rpc = new JsonRpc(process.env.EOS_API_ENDPOINT, { fetch }); // required to read blockchain state
const api = new Api({ rpc, signatureProvider }); // required to submit transactions

const claim = ({ id, toAddress, amount, symbol }) => {
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
      quantity: `${amount} ${symbol}`,
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
    });
};

ws.on('open', () => {
  LOG('Connection Established!', {
    eosOracle,
    polygonOracle,
    contractAddress,
    claimedTopic,
  });
  ws.send(JSON.stringify(eventSubscription));
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
  LOG('TOPIC:', topic);
  if (topic === claimedTopic) {
    const [id, toAddress] = topicParams;
    const tokenAddress = '0x6283A71E0067695FD8Fc3adF4256d65b4854F73F';
    const tokenInfo = symbolToEthAddressMap[tokenAddress];
    const amount = parseInt(data, 16) / `1e${tokenInfo.polygonDecimals}`;

    claim({
      id: parseInt(id, 16),
      toAddress: toAddress.replace('0x', ''),
      amount,
      symbol: tokenInfo.account,
    });
  }
});

ws.on('error', (error) => {
  ERROR(error);
});
