export interface WaxTransferData {
  rows: TransferDataRow[];
  more: boolean;
  next_key: string;
}

export interface TransferDataRow {
  id: number;
  time: number;
  account: string;
  quantity: string;
  chain_id: number;
  to_address: string;
  oracles: string[];
  signatures: string[];
  claimed: number;
}
