export interface WaxReceiveData {
  rows: ReceiveDataRow[];
  more: boolean;
  next_key: string;
}

export interface ReceiveDataRow {
  id: number;
  to_account: string;
  quantity: string;
  chain_id: number;
  oracles: string[];
  claimed: number;
}
