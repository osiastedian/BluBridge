import WebSocket from "ws";
import { Api, JsonRpc } from "eosjs";
import fetch from "node-fetch";
import Web3 from "web3";
import { createDfuseClient } from "@dfuse/client";

import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig.js"; // development only

const bridgeContract = "bvctvozrlgrg";
const logsendAction = "logsend";
const oracleAccount = "atyqxmszvnsk";
const privateKeys = ["5K5fQ4RUVnZmcHxCFE8LgLMJtGkCCHobGYdfMbgF5uv3KJszRiD"];

const ethAddress = "0xb6415b4fAC8A27334FD5a09F9457E110f3eE86eb";
const web3Api = "ws://localhost:8545";

const web3 = new Web3(web3Api);

const signatureProvider = new JsSignatureProvider(privateKeys);
const rpc = new JsonRpc("https://api.testnet.eos.io/", { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider }); //required to submit transactions

global.fetch = fetch;
global.WebSocket = WebSocket;

const symbolToEthAddressMap = {
  TNT: {
    address: "0xe0cbf38a0c610113379c086dc79ccaaf1eb5c20b",
    decimals: 6,
  },
};

const registerSignature = (id, signature) =>
  api.transact(
    {
      actions: [
        {
          account: bridgeContract,
          name: "sign",
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
    apiKey: "server_9c7c311de0cdd3799955ea2eb6eda910",
    network: "testnet.eos.dfuse.io",
  });

  console.log("Staring EOS Oracle");

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
          const { from, to, quantity, memo, to_address, token_address } =
            action.json;
          console.log(action);
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
          console.log("RAW DATA", rawData);
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
