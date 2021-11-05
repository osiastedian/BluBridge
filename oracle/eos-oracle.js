import WebSocket from "ws";
import { Api, JsonRpc } from "eosjs";
import fetch from "node-fetch";
import Web3 from "web3";
import { createDfuseClient } from "@dfuse/client";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig.js"; // development only
import dotenv from "dotenv";
dotenv.config();

const bridgeContract = process.env.EOS_CONTRACT_ACCOUNT;
const logsendAction = process.env.EOS_CONTRACT_ACTION_LOGSEND;
const signAction = process.env.EOS_CONTRACT_ACTION_SIGN;
const oracleAccount = process.env.ORACLE_EOS_ACCOUNT;

const ethAddress = process.env.ORACLE_POLYGON_ADDRESS;

const web3 = new Web3(process.env.POLYGON_API_ENDPOINT);

const signatureProvider = new JsSignatureProvider([
  process.env.ORACLE_EOS_PRIVATE_KEY,
]);
const rpc = new JsonRpc(process.env.EOS_API_ENDPOINT, { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider }); //required to submit transactions

global.fetch = fetch;
global.WebSocket = WebSocket;

const symbolToEthAddressMap = require(process.env.EOS_SYMBOL_TOKEN_ADDRESS_MAO);

const registerSignature = (id, signature) =>
  api.transact(
    {
      actions: [
        {
          account: bridgeContract,
          name: signAction,
          authorization: [
            {
              actor: oracleAccount,
              permission: "active",
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

const generateEthSignature = (transferData) => {
  const { id, amount, chainId, tokenAddress, toAddress } = transferData;
  const encoded = web3.eth.abi.encodeParameter(
    {
      ParentStruct: {
        propertyOne: "uint64", // id
        propertyTwo: "uint256", // amount
        propertyThree: "uint8", // chainId
        propertyFour: "address", // tokenAddress
        propertyFive: "address", // toAddress
      },
    },
    {
      propertyOne: id,
      propertyTwo: amount,
      propertyThree: chainId,
      propertyFour: tokenAddress,
      propertyFive: toAddress,
    }
  );
  const hashed = web3.utils.sha3(encoded);
  return web3.eth
    .sign(hashed, ethAddress)
    .then(
      (signature) =>
        signature.substr(0, 130) + (signature.substr(130) == "00" ? "1b" : "1c")
    );
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

const run = async () => {
  const client = createDfuseClient({
    apiKey: process.env.DFUSE_API_KEY,
    network: process.env.DFUSE_NETWORK,
  });

  console.log(`Starting EOS Oracle: ${oracleAccount}`);

  await client.graphql(
    streamTransfer,
    (message, stream) => {
      if (message.type === "error") {
        console.log("An error occurred", message.errors, message.terminal);
      }

      if (message.type === "data") {
        const data = message.data.searchTransactionsForward;
        const actions = data.trace.matchingActions;
        console.log("cursor", data.cursor);

        actions.forEach((action) => {
          const { quantity, memo, to_address } = action.json;
          const id = action.json.id;
          const chainId = action.json.chain_id;
          const padding = "000000000000000000000000";
          const toAddress = to_address.replace(padding, "0x");
          const [amount, symbol] = quantity.split(" ");

          const token = symbolToEthAddressMap[symbol];

          const rawData = {
            id,
            chainId,
            toAddress,
            amount: amount * `1e${token.decimals}`,
            tokenAddress: token.address,
          };
          generateEthSignature(rawData)
            .then((signature) => registerSignature(id, signature))
            .then((result) => console.log("Successful sign: \n", result));
        });

        stream.mark({ cursor: data.cursor });
      }

      if (message.type === "complete") {
        console.log("Stream completed");
      }
    },
    {
      variables: {
        query: `receiver:${bridgeContract} action:${logsendAction}`,
        cursor: "",
        limit: 10,
        irreversibleOnly: true,
      },
    }
  );
};

run().catch(console.error);
