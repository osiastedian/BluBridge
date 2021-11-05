import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

const wsEndpoint = process.env.ALCHEMY_WS_ENDPOINT;
const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS;
const claimedTopic = process.env.POLYGON_CONTRACT_CLAIMED_TOPIC;

const ws = new WebSocket(wsEndpoint, {
  createConnection: ({}, (error, socket) => console.log({ error, socket })),
});

const eventSubscription = {
  jsonrpc: "2.0",
  id: 1,
  method: "eth_subscribe",
  params: [
    "logs",
    {
      address: contractAddress,
      topics: [claimedTopic],
    },
  ],
};

ws.on("open", () => {
  console.log("Connection Established!");
  ws.send(JSON.stringify(eventSubscription));
});

ws.on("message", (rawData) => {
  const json = JSON.parse(rawData);
  console.log(JSON.stringify(json));
  if (!json?.params?.result) {
    return;
  }
  const { topics, data } = json?.params?.result;
});

ws.on("error", (error) => {
  console.log({ error });
});
