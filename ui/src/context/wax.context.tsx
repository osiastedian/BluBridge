import { TransactResult } from 'eosjs/dist/eosjs-api-interfaces';
import { createContext, useContext, useEffect, useState } from 'react';
import * as waxjs from '@waxio/waxjs/dist';

import { addPrecision, retryOperation } from '../services/utils.service';
import { useDfuse } from './dfuse.context';
import { OnGraphqlStreamMessage } from '@dfuse/client';
import {
  TransferDataRow,
  WaxTransferData,
} from '../shared/interfaces/wax-transfer-data';
import {
  ReceiveDataRow,
  WaxReceiveData,
} from '../shared/interfaces/wax-receive-data';
const wax = new waxjs.WaxJS({ rpcEndpoint: 'https://wax.greymass.com' });

interface WaxContextProps {
  accountName: string;
  pubKeys: string[];
  isConnected: boolean;
  login: () => Promise<string>;
  fetchBalance: (
    tokenSymbol: string,
    tokenContract: string
  ) => Promise<number>;
  transfer: (
    tokenSymbol: string,
    tokenContract: string,
    toAddress: string,
    amount: number,
    precision?: number
  ) => Promise<void>;
  send: (
    account: string,
    tokenSymbol: string,
    bridgeContract: string,
    chainId: number,
    ethAddress: string,
    amount: number,
    precision?: number
  ) => Promise<void>;
  listenToLogSend: (fromAccount: string) => Promise<string>;
  getSignatures: (id: number) => Promise<string[]>;
  getReceiveData: (id: number) => Promise<ReceiveDataRow>;
  claim: (
    fromAccount: string,
    bridgeContract: string,
    txId: number
  ) => Promise<TransactResult>;
  withdraw: (
    fromAccount: string,
    bridgeContract: string
  ) => Promise<TransactResult>;
}

const waxBluBridgerContract = process.env.EOS_BLU_BRIDGER_CONTRACT;
const WaxContext = createContext<Partial<WaxContextProps>>({});

export const useWax = () => useContext(WaxContext);

const WaxContextProvider: React.FC = ({ children }) => {
  const [accountName, setAccountName] = useState(wax.userAccount);
  const [pubKeys, setPubkeys] = useState(wax.pubKeys);
  const { listenToStreamTransfer } = useDfuse();

  const login = async () => {
    const accountName = await wax.login();
    setAccountName(accountName);
    return accountName;
  };

  const fetchBalance = async (
    tokenSymbol: string,
    tokenContract: string
  ): Promise<number> => {
    const value = await wax.api.rpc.get_currency_balance(
      tokenContract,
      accountName,
      tokenSymbol
    );
    let waxValue = 0;

    if (value[0]) {
      waxValue = Number(value[0].split(' ')[0]);
    }

    return waxValue;
  };

  const transfer = async (
    tokenSymbol: string,
    tokenContract: string,
    toAddress: string,
    amount: number,
    precision = 4
  ) => {
    try {
      await wax.api.transact(
        {
          actions: [
            {
              account: tokenContract,
              name: 'transfer',
              authorization: [
                {
                  actor: wax.userAccount,
                  permission: 'active',
                },
              ],
              data: {
                from: wax.userAccount,
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
    } catch (e) {
      console.error(e);
      throw 'Failed to transfer tokens to the bridge. Please try again or contact admin.';
    }
  };

  const send = async (
    account: string,
    tokenSymbol: string,
    bridgeContract: string,
    chainId: number,
    ethAddress: string,
    amount: number,
    precision = 4
  ): Promise<void> => {
    const transaction = wax.api.transact(
      {
        actions: [
          {
            account: bridgeContract,
            name: 'send',
            authorization: [
              {
                actor: account,
                permission: 'active',
              },
            ],
            data: {
              from: account,
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
      console.log('Wax Send', { result });
      return;
    } catch (e) {
      console.error(e);
      throw 'Failed to execute send transaction to the bridge. Please try again or contact admin.';
    }
  };

  const listenToLogSend = (fromAccount: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const onMessage: OnGraphqlStreamMessage<any> = (message, stream) => {
        if (message.type === 'error') {
          console.error('An error occurred', message.errors, message.terminal);
          throw 'An error eccorded while listening to DFuse stream.';
        }

        if (message.type === 'data') {
          const rawData = message.data.searchTransactionsForward;
          const actions = rawData.trace.matchingActions;

          actions.forEach((action) => {
            const { id, from, quantity } = action.json;

            if (fromAccount === from) {
              resolve(id);
            }
          });

          stream.mark({ cursor: rawData.cursor });
        }

        if (message.type === 'complete') {
          console.log('Stream completed');
        }
      };
      listenToStreamTransfer(waxBluBridgerContract, 'logsend', onMessage);

      setTimeout(() => {
        reject(new Error('Failed to fetch sending'));
      }, 300000);
    });

  const getTransferDataInfo = async (id: number): Promise<TransferDataRow> => {
    const transferData: WaxTransferData = await wax.rpc.get_table_rows({
      json: true,
      code: waxBluBridgerContract,
      scope: waxBluBridgerContract,
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
  };

  const listenToTableInfo = async (id: number): Promise<TransferDataRow> => {
    const row = await retryOperation(
      async () => await getTransferDataInfo(id),
      4000,
      30
    );

    return row as TransferDataRow;
  };

  const getSignatures = async (transferId: number): Promise<string[]> => {
    const transferDataRow = await listenToTableInfo(transferId);
    return transferDataRow.signatures;
  };

  const getReceiveData = async (id: number): Promise<ReceiveDataRow> => {
    const receiveData: WaxReceiveData = await wax.rpc.get_table_rows({
      json: true,
      code: waxBluBridgerContract,
      scope: waxBluBridgerContract,
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
  };

  const claim = async (
    fromAccount: string,
    bridgeContract: string,
    txId: number
  ): Promise<TransactResult> => {
    const transaction = wax.api.transact(
      {
        actions: [
          {
            account: bridgeContract,
            name: 'claim',
            authorization: [
              {
                actor: fromAccount,
                permission: 'active',
              },
            ],
            data: {
              from: fromAccount,
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
      console.log('Wax CLAIM', { result });
      return result as TransactResult;
    } catch (e) {
      console.error(e);
      throw 'Failed to claim transaction from the bridge. Please try again or contact admin.';
    }
  };

  const withdraw = async (
    fromAccount: string,
    bridgeContract: string
  ): Promise<TransactResult> => {
    const transaction = wax.api.transact(
      {
        actions: [
          {
            account: bridgeContract,
            name: 'withdraw',
            authorization: [
              {
                actor: fromAccount,
                permission: 'active',
              },
            ],
            data: {
              from: fromAccount,
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
  };

  useEffect(() => {
    wax.isAutoLoginAvailable().then((isAutoLoginAvailable) => {
      if (isAutoLoginAvailable) {
        setAccountName(wax.userAccount);
        setPubkeys(wax.pubKeys);
      }
    });
  }, []);
  return (
    <WaxContext.Provider
      value={{
        accountName,
        pubKeys,
        login,
        isConnected: Boolean(accountName),
        fetchBalance,
        transfer,
        send,
        listenToLogSend,
        getSignatures,
        getReceiveData,
        claim,
        withdraw,
      }}
    >
      {children}
    </WaxContext.Provider>
  );
};

export default WaxContextProvider;
