export interface PolygonTransaction {
  blockHash: string;
  blockNumber: number;
  contractAddress: null;
  cumulativeGasUsed: number;
  effectiveGasPrice: string;
  from: string;
  gasUsed: number;
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
  events: Events;
}

interface Events {
  '0': Event;
  '1': Event;
  '2': Event;
  Sent: Sent;
}

interface Event {
  address: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  id: string;
  returnValues: any;
  signature: null;
  raw: Raw;
}

interface Raw {
  data: string;
  topics: string[];
}

interface Sent {
  address: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  id: string;
  returnValues: any;
  event: string;
  signature: string;
  raw: Raw;
}
