import React, { createContext, useCallback, useContext, useState } from 'react';
import useLogger, { Log } from '../hooks/useLogger';
import { hexToPrependedZeros } from '../services/utils.service';
import { WaxToPolygonBluChainId } from '../shared/constants';
import { SupportedBlockchain } from '../types/supported-blockchain';
import { usePolygon } from './polygon.context';
import { useWax } from './wax.context';

interface TransferState {
  from: SupportedBlockchain;
  to: SupportedBlockchain;
  amount: number;
  isProcessing: boolean;
}

const initialState: TransferState = {
  amount: 0,
  from: 'wax',
  to: 'polygon',
  isProcessing: false,
};

interface TransferContextProps {
  state: TransferState;
  isReadyForTransfer: boolean;
  transferLogs: Log[];
  transfer: () => void;
  switchChains: () => void;
  updateAmount: (amount: number) => void;
  fetchBalance: () => Promise<number>;
}

const TransferContext = createContext<Partial<TransferContextProps>>({
  state: initialState,
});

export const useTransfer = () => useContext(TransferContext);

const TransferContextProvider: React.FC = ({ children }) => {
  const {
    address,
    fetchBalance: polygonFetchBalance,
    claim: polygonClaim,
  } = usePolygon();
  const {
    accountName,
    fetchBalance: waxFetchBalance,
    transfer: waxTransfer,
    send: waxSend,
    listenToLogSend,
    getSignatures,
  } = useWax();
  const { clearLogs, addErrorLog, addSuccessLog, addLoadingLog, logs } =
    useLogger();

  const connectedChains: Record<SupportedBlockchain, boolean> = {
    wax: Boolean(accountName),
    polygon: Boolean(address),
  };

  const [transferState, setTransferState] =
    useState<TransferState>(initialState);

  const switchChains = () => {
    const from = transferState.to;
    setTransferState((currentState) => ({
      ...currentState,
      from,
      to: transferState.from,
    }));
  };

  const updateAmount = (amount: number) => {
    setTransferState((currentState) => ({ ...currentState, amount }));
  };

  const transferWaxToPolygon = async () => {
    const { amount } = transferState;
    try {
      addLoadingLog(
        'Waiting for approval from Wax Wallet to transfer to bridge.'
      );
      await waxTransfer('BLU', 'bludactokens', 'blubridgerv1', amount);

      addSuccessLog(`Successfully transferred ${amount} BLU to bridge.`);
      addLoadingLog('Waiting for approval to transfer to Polygon');
      const listendToLogSend = listenToLogSend(accountName);
      await waxSend(
        accountName,
        'BLU',
        'blubridgerv1',
        WaxToPolygonBluChainId,
        hexToPrependedZeros(address),
        amount
      );
      addSuccessLog(
        'Successfully submitted transaction (Transfer BLU to Polygon)'
      );
      addLoadingLog('Confirming Bridge to Polygon transaction.');
      const transferId = await listendToLogSend;
      if (transferId && typeof transferId !== 'number') {
        throw 'Transaction failed. Invalid transfer ID.';
      }
      addLoadingLog('Signing transaction and confirming transaction validity.');
      const signatures = await getSignatures(parseInt(transferId, 10));
      const claimTransactionHash = await polygonClaim(
        address,
        parseInt(transferId),
        amount,
        WaxToPolygonBluChainId,
        signatures
      );
      addSuccessLog(
        `Successfully submitted transaction to claim tokens. <a href="https://polygonscan.com/tx/${claimTransactionHash}" target="_blank">View transaction</a>`
      );
    } catch (errorMessage) {
      addErrorLog(errorMessage);
    }
  };

  const transferPolygonToWax = async () => {};

  const transfer = async () => {
    clearLogs();
    setTransferState((currentState) => ({
      ...currentState,
      isProcessing: true,
    }));
    const { from, to } = transferState;
    if (from === 'wax' && to === 'polygon') {
      await transferWaxToPolygon();
    } else if (from === 'polygon' && to === 'wax') {
      await transferPolygonToWax();
    }
    setTransferState((currentState) => ({
      ...currentState,
      isProcessing: false,
    }));
  };

  const fetchBalance = useCallback(() => {
    const { from } = transferState;
    if (from === 'wax') {
      return waxFetchBalance('BLU', 'bludactokens');
    }
    if (from === 'polygon') {
      return polygonFetchBalance();
    }
  }, [waxFetchBalance, polygonFetchBalance, transferState]);

  return (
    <TransferContext.Provider
      value={{
        state: transferState,
        switchChains,
        updateAmount,
        isReadyForTransfer:
          connectedChains[transferState.from] &&
          connectedChains[transferState.to],
        transfer,
        fetchBalance,
        transferLogs: logs,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
};

export default TransferContextProvider;
