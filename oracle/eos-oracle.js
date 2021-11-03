import WebSocket from "ws";
import { Api, JsonRpc } from "eosjs";
import fetch from "node-fetch";
import Web3 from "web3";
import StateReceiver from "@eosdacio/eosio-statereceiver";

import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig.js"; // development only

const privateKeys = ["5JEWJ2LXiE5EVLV2p5NYwWVAx8GTH6yJ2Qp2EW5pA6Ft2iXjjFW"];
const publicKeys = ["EOS677qAWt7nstabbYZw6acXfU5mzQbx8QEnqoJ1KMn2cm1CdYV1v"];

const signatureProvider = new JsSignatureProvider(privateKeys);
const rpc = new JsonRpc("https://wax.greymass.com/", { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider }); //required to submit transactions

const oracleAccount = "test";
const ethAddress = "0x9F786f29c5a4D192D442fc9237E142cbD99B573e";

const web3 = new Web3("ws://localhost:8546");
const bridgeContract = "blubridge";

import { createDfuseClient, InboundMessageType } from "@dfuse/client";

global.fetch = fetch;
global.WebSocket = WebSocket;

const registerSignature = (id, signature) =>
  api.transact(
    {
      actions: [
        {
          account: bridgeContract,
          name: "regSign",
          authorization: [
            {
              actor: oracleAccount,
              permission: "active",
            },
          ],
          data: {
            id,
            signature,
            name: oracleAccount,
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

const run = async () => {
  const client = createDfuseClient({
    apiKey: "0dbd9344a5a84eebd17b03e0f82b9451",
    network: "testnet.eos.dfuse.io",
  });

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

        actions.forEach(({ json }) => {
          const { from, to, quantity, memo } = json;
          const signature = generateEthSignature({ from, to, quantity, memo });
          registerSignature(signature);
        });

        stream.mark({ cursor: data.cursor });
      }

      if (message.type === "complete") {
        console.log("Stream completed");
      }
    },
    {
      variables: {
        query: "receiver:bludactokens action:transfer",
        cursor: "",
        limit: 10,
        irreversibleOnly: true,
      },
    }
  );
};

run().catch(console.error);
