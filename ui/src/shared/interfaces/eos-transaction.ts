export interface EOSTransaction {
  type: string;
  data: Data;
}

export interface Data {
  searchTransactionsForward: SearchTransactionsForward;
}

export interface SearchTransactionsForward {
  undo: boolean;
  cursor: string;
  trace: Trace;
}

export interface Trace {
  block: Block;
  id: string;
  matchingActions: MatchingAction[];
}

export interface Block {
  num: number;
  id: string;
  confirmed: number;
  timestamp: Date;
  previous: string;
}

export interface MatchingAction {
  account: string;
  name: string;
  json: JSON;
  seq: string;
  receiver: string;
}

export interface JSON {
  id: number;
  oracle_name: string;
  signature: string;
}
