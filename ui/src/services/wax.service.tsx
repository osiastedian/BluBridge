import { TransactResult } from 'eosjs/dist/eosjs-api-interfaces';

import * as waxjs from '@waxio/waxjs/dist';

import { ReceiveDataRow, WaxReceiveData } from '../shared/interfaces/wax-receive-data';
import { TransferDataRow, WaxTransferData } from '../shared/interfaces/wax-transfer-data';
import { addPrecision, retryOperation } from './utils.service';

export type EosTokenContract = 'eosio.token' | 'bludactokens';
export type EosBridgeContract = 'blubridgerv1';
export type EosTokenSymbol = 'WAX' | 'BLU';
class WaxService {
  wax = new waxjs.WaxJS({ rpcEndpoint: 'https://wax.greymass.com' });

  constructor() {}

  get accountName(): string {
    return this.wax.userAccount;
  }

  async login(callback: Function) {
    try {
      const userAccount = await this.wax.login();

      callback(userAccount);
    } catch (e) {}
  }

  async fetchBalance(
    tokenSymbol: EosTokenSymbol,
    tokenContract: EosTokenContract
  ): Promise<number> {
    if (!this.wax.api) {
      await this.login(() => {});
    }
    const value = await this.wax.api.rpc.get_currency_balance(
      tokenContract,
      this.wax.userAccount,
      tokenSymbol
    );
    let waxValue = 0;

    if (value[0]) {
      waxValue = Number(value[0].split(' ')[0]);
    }

    return waxValue;
  }

  async transfer(
    tokenSymbol: EosTokenSymbol,
    tokenContract: EosTokenContract,
    toAddress: EosBridgeContract | string,
    amount: number,
    precision = 4
  ): Promise<void> {
    const transaction = this.wax.api.transact(
      {
        actions: [
          {
            account: tokenContract,
            name: 'transfer',
            authorization: [
              {
                actor: this.wax.userAccount,
                permission: 'active',
              },
            ],
            data: {
              from: this.wax.userAccount,
              to: toAddress,
              quantity: `${addPrecision(amount, precision)} ${tokenSymbol}`,
              memo: '',
            },
          },
        ],
      },
      {
        blocksBehind: 3,
        expireSeconds: 1000,
      }
    );

    try {
      const result = await transaction;
      return;
    } catch (e) {
      console.error(e);
      throw 'Failed to transfer tokens to the bridge. Please try again or contact admin.';
    }
  }

  async sendToEth(
    tokenSymbol: EosTokenSymbol,
    bridgeContract: EosBridgeContract,
    chainId: number,
    ethAddress: string,
    amount: number,
    precision = 4
  ): Promise<void> {
    const transaction = this.wax.api.transact(
      {
        actions: [
          {
            account: bridgeContract,
            name: 'send',
            authorization: [
              {
                actor: this.wax.userAccount,
                permission: 'active',
              },
            ],
            data: {
              from: this.wax.userAccount,
              eth_address: ethAddress,
              chain_id: chainId,
              quantity: `${addPrecision(amount, precision)} ${tokenSymbol}`,
            },
          },
        ],
      },
      {
        blocksBehind: 3,
        expireSeconds: 1000,
      }
    );

    try {
      const result = await transaction;
      return;
    } catch (e) {
      console.error(e);
      throw 'Failed to execute send transaction to the bridge. Please try again or contact admin.';
    }
  }

  async claim(bridgeContract: EosBridgeContract, txId: number): Promise<any> {
    const transaction = this.wax.api.transact(
      {
        actions: [
          {
            account: bridgeContract,
            name: 'claim',
            authorization: [
              {
                actor: this.wax.userAccount,
                permission: 'active',
              },
            ],
            data: {
              from: this.wax.userAccount,
              id: txId,
            },
          },
        ],
      },
      {
        blocksBehind: 3,
        expireSeconds: 1000,
      }
    );

    try {
      const result = await transaction;
      return result;
    } catch (e) {
      console.error(e);
      throw 'Failed to claim transaction from the bridge. Please try again or contact admin.';
    }
  }

  async withdraw(bridgeContract: EosBridgeContract): Promise<TransactResult> {
    const transaction = this.wax.api.transact(
      {
        actions: [
          {
            account: bridgeContract,
            name: 'withdraw',
            authorization: [
              {
                actor: this.wax.userAccount,
                permission: 'active',
              },
            ],
            data: {
              from: this.wax.userAccount,
            },
          },
        ],
      },
      {
        blocksBehind: 3,
        expireSeconds: 1000,
      }
    );

    try {
      const result: TransactResult = (await transaction) as TransactResult;
      return result;
    } catch (e) {
      console.error(e);
      throw 'Transaction to withdraw tokens from Wax failed.';
    }
  }

  async listenToTableInfo(id: number): Promise<TransferDataRow> {
    const row = await retryOperation(
      async () => await this.getTransferDataInfo(id),
      4000,
      30
    );

    return row as TransferDataRow;
  }

  async getTransferDataInfo(id: number): Promise<TransferDataRow> {
    const transferData: WaxTransferData = await this.wax.rpc.get_table_rows({
      json: true,
      code: 'blubridgerv1',
      scope: 'blubridgerv1',
      table: 'transferdata',
      lower_bound: id,
      limit: 1,
      reverse: false,
      show_payer: false,
    });

    if (
      transferData &&
      transferData.rows &&
      transferData.rows.length > 0 &&
      transferData.rows[0].signatures.length === 4
    ) {
      return transferData.rows[0];
    }

    return null;
  }

  async getReceiveData(id: number): Promise<ReceiveDataRow> {
    const receiveData: WaxReceiveData = await this.wax.rpc.get_table_rows({
      json: true,
      code: 'blubridgerv1',
      scope: 'blubridgerv1',
      table: 'receivedata',
      lower_bound: id,
      limit: 1,
      reverse: false,
      show_payer: false,
    });

    if (receiveData && receiveData.rows && receiveData.rows.length > 0) {
      return receiveData.rows[0];
    }

    throw `Received data is invalid. (ID: ${id})`;
  }
}

const waxService = new WaxService();
export default waxService;
