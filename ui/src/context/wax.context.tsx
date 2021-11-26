import { createContext, useContext, useEffect, useState } from 'react';
import * as waxjs from '@waxio/waxjs/dist';
import {
  EosBridgeContract,
  EosTokenContract,
  EosTokenSymbol,
} from '../types/eos-types';
import { addPrecision, retryOperation } from '../services/utils.service';
import { useDfuse } from './dfuse.context';
import { OnGraphqlStreamMessage } from '@dfuse/client';
import {
  TransferDataRow,
  WaxTransferData,
} from '../shared/interfaces/wax-transfer-data';
const wax = new waxjs.WaxJS({ rpcEndpoint: 'https://wax.greymass.com' });

interface WaxContextProps {
  accountName: string;
  pubKeys: string[];
  isConnected: boolean;
  login: () => void;
  fetchBalance: (
    tokenSymbol: EosTokenSymbol,
    tokenContract: EosTokenContract
  ) => Promise<number>;
  transfer: (
    tokenSymbol: EosTokenSymbol,
    tokenContract: EosTokenContract,
    toAddress: EosBridgeContract | string,
    amount: number,
    precision?: number
  ) => Promise<void>;
  send: (
    account: string,
    tokenSymbol: EosTokenSymbol,
    bridgeContract: EosBridgeContract,
    chainId: number,
    ethAddress: string,
    amount: number,
    precision?: number
  ) => Promise<void>;
  listenToLogSend: (fromAccount: string) => Promise<string>;
  getSignatures: (id: number) => Promise<string[]>;
}

const WaxContext = createContext<Partial<WaxContextProps>>({});

export const useWax = () => useContext(WaxContext);

const WaxContextProvider: React.FC = ({ children }) => {
  const [accountName, setAccountName] = useState(wax.userAccount);
  const [pubKeys, setPubkeys] = useState(wax.pubKeys);
  const { listenToStreamTransfer } = useDfuse();

  const login = () => {
    wax.login().then(setAccountName);
  };

  const fetchBalance = async (
    tokenSymbol: EosTokenSymbol,
    tokenContract: EosTokenContract
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
    tokenSymbol: EosTokenSymbol,
    tokenContract: EosTokenContract,
    toAddress: EosBridgeContract | string,
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
    tokenSymbol: EosTokenSymbol,
    bridgeContract: EosBridgeContract,
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
      console.log({ result });
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
      listenToStreamTransfer('blubridgerv1', 'logsend', onMessage);

      setTimeout(() => {
        reject(new Error('Failed to fetch sending'));
      }, 300000);
    });

  const getTransferDataInfo = async (id: number): Promise<TransferDataRow> => {
    const transferData: WaxTransferData = await wax.rpc.get_table_rows({
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
      }}
    >
      {children}
    </WaxContext.Provider>
  );
};

export default WaxContextProvider;
