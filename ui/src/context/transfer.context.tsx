import React, { createContext, useCallback, useContext, useState } from 'react';
import useLogger, { Log } from '../hooks/useLogger';
import { hexToPrependedZeros } from '../services/utils.service';
import {
  PolygonToWaxBluChainId,
  WaxToPolygonBluChainId,
} from '../shared/constants';
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
  const polygon = usePolygon();
  const wax = useWax();
  const { clearLogs, addErrorLog, addSuccessLog, addLoadingLog, logs } =
    useLogger();

  const connectedChains: Record<SupportedBlockchain, boolean> = {
    wax: Boolean(wax.accountName),
    polygon: Boolean(polygon.address),
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
      await wax.transfer('BLU', 'bludactokens', 'blubridgerv1', amount);

      addSuccessLog(`Successfully transferred ${amount} BLU to bridge.`);
      addLoadingLog('Waiting for approval to transfer to Polygon');
      const listendToLogSend = wax.listenToLogSend(wax.accountName);
      await wax.send(
        wax.accountName,
        'BLU',
        'blubridgerv1',
        WaxToPolygonBluChainId,
        hexToPrependedZeros(polygon.address),
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
      const signatures = await wax.getSignatures(parseInt(transferId, 10));
      const claimTransactionHash = await polygon.claim(
        polygon.address,
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

  const transferPolygonToWax = async () => {
    const { amount } = transferState;
    try {
      addLoadingLog('Waiting to approve spend amount for transaction.');
      await polygon.approve(polygon.address, amount, 4);
      addSuccessLog('Successfully approved spend amount for transaction.');
      addLoadingLog('Waiting for approval to send BLU tokens to bridge.');
      const claimId = await polygon.bridgeSend(
        polygon.address,
        wax.accountName,
        PolygonToWaxBluChainId,
        amount,
        4
      );
      addSuccessLog('Successfully sent BLU tokens to bridge.');
      addLoadingLog(
        'Waiting for approval to claim BLU tokens from target blockchain.'
      );
      const receivedData = await wax.getReceiveData(claimId);
      if (receivedData.oracles.length === 0) {
        throw 'Failed to confirm transaction, no oracles assigned.';
      }
      addSuccessLog(
        `Successfully verified receive transaction validity ID: ${receivedData.id}`
      );
      addLoadingLog(`Waiting for approval from Wax Wallet to receive tokens.`);
      await wax.claim(wax.accountName, 'blubridgerv1', claimId);
      addSuccessLog(`Successfully submitted transaction to claim tokens.`);
      addLoadingLog(
        'Waiting for approval to withdraw your tokens from the bridge.'
      );
      const withdraw = await wax.withdraw(wax.accountName, 'blubridgerv1');
      addSuccessLog(
        `Successfully submitted transaction to withdraw tokens. <a href="https://wax.bloks.io/transaction/${withdraw.transaction_id}" target="_blank">View transaction</a>`
      );
    } catch (errorMessage) {
      addErrorLog(errorMessage);
    }
  };

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
      return wax.fetchBalance('BLU', 'bludactokens');
    }
    if (from === 'polygon') {
      return polygon.fetchBalance();
    }
  }, [wax, polygon, transferState]);

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
