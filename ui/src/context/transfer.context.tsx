import React, { createContext, useCallback, useContext, useState } from 'react';

import useLogger, { Log } from '../hooks/useLogger';
import { hexToPrependedZeros } from '../services/utils.service';
import {
    BSCToWaxBluChainId, PolygonToWaxBluChainId, WaxToBSCBluChainId, WaxToPolygonBluChainId
} from '../shared/constants';
import { SupportedBlockchain } from '../types/supported-blockchain';
import { BSCContextProps, useBSC } from './bsc.context';
import { PolygonContextProps, usePolygon } from './polygon.context';
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
  to: 'bsc',
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

const waxBluBridgerContract = process.env.EOS_BLU_BRIDGER_CONTRACT;
const eosTokenContract = process.env.EOS_TOKEN_CONTRACT;
const eosTokenSymbol = process.env.EOS_TOKEN_SYMBOL;

const TransferContext = createContext<Partial<TransferContextProps>>({
  state: initialState,
});

export const useTransfer = () => useContext(TransferContext);

const TransferContextProvider: React.FC = ({ children }) => {
  const polygon = usePolygon();
  const wax = useWax();
  const bsc = useBSC();
  const { clearLogs, addErrorLog, addSuccessLog, addLoadingLog, logs } =
    useLogger();

  const connectedChains: Record<SupportedBlockchain, boolean> = {
    wax: Boolean(wax.accountName),
    polygon: Boolean(polygon.address),
    bsc: Boolean(bsc.address),
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

  const transferWaxToMM = async (
    mmChain: Partial<PolygonContextProps | BSCContextProps>,
    targetChainId: number,
    chainName: string,
    explorerUrl: string
  ) => {
    const { amount } = transferState;
    try {
      addLoadingLog(
        'Waiting for approval from Wax Wallet to transfer to bridge.'
      );
      await wax.transfer(
        eosTokenSymbol,
        eosTokenContract,
        waxBluBridgerContract,
        amount
      );

      addSuccessLog(
        `Successfully transferred ${amount} ${eosTokenSymbol} to bridge.`
      );
      addLoadingLog(`Waiting for approval to transfer to ${chainName}`);
      const listendToLogSend = wax.listenToLogSend(wax.accountName);
      await wax.send(
        wax.accountName,
        eosTokenSymbol,
        waxBluBridgerContract,
        targetChainId,
        hexToPrependedZeros(mmChain.address),
        amount
      );
      addSuccessLog(
        `Successfully submitted transaction (Transfer ${eosTokenSymbol} to ${chainName})`
      );
      addLoadingLog(`Confirming Bridge to ${chainName} transaction.`);
      const transferId = await listendToLogSend;
      if (transferId && typeof transferId !== 'number') {
        throw 'Transaction failed. Invalid transfer ID.';
      }
      addLoadingLog('Signing transaction and confirming transaction validity.');
      const signatures = await wax.getSignatures(parseInt(transferId, 10));
      const claimTransactionHash = await mmChain.claim(
        mmChain.address,
        parseInt(transferId),
        amount,
        targetChainId,
        signatures
      );
      addSuccessLog(
        `Successfully submitted transaction to claim tokens. <a href="${explorerUrl}${claimTransactionHash}" target="_blank">View transaction</a>`
      );
    } catch (errorMessage) {
      addErrorLog(errorMessage);
    }
  };

  const transferMMtoWax = async (
    mmChain: Partial<PolygonContextProps | BSCContextProps>,
    targetChainId: string
  ) => {
    const { amount } = transferState;
    try {
      addLoadingLog('Waiting to approve spend amount for transaction.');
      await mmChain.approve(mmChain.address, amount, 4);
      addSuccessLog('Successfully approved spend amount for transaction.');
      addLoadingLog(
        `Waiting for approval to send ${eosTokenSymbol} tokens to bridge.`
      );
      const claimId = await mmChain.bridgeSend(
        mmChain.address,
        wax.accountName,
        targetChainId,
        amount,
        4
      );
      addSuccessLog(`Successfully sent ${eosTokenSymbol} tokens to bridge.`);
      addLoadingLog(
        `Waiting for approval to claim ${eosTokenSymbol} tokens from target blockchain.`
      );
      const receivedData = await wax.getReceiveData(claimId);
      if (receivedData.oracles.length === 0) {
        throw 'Failed to confirm transaction, no oracles assigned.';
      }
      addSuccessLog(
        `Successfully verified receive transaction validity ID: ${receivedData.id}`
      );
      addLoadingLog(`Waiting for approval from Wax Wallet to receive tokens.`);
      await wax.claim(wax.accountName, waxBluBridgerContract, claimId);
      addSuccessLog(`Successfully submitted transaction to claim tokens.`);
      addLoadingLog(
        'Waiting for approval to withdraw your tokens from the bridge.'
      );
      const withdraw = await wax.withdraw(
        wax.accountName,
        waxBluBridgerContract
      );
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
      await transferWaxToMM(
        polygon,
        WaxToPolygonBluChainId,
        'Polygon',
        'https://polygonscan.com/tx/'
      );
    } else if (from === 'polygon' && to === 'wax') {
      await transferMMtoWax(polygon, PolygonToWaxBluChainId);
    } else if (from === 'wax' && to === 'bsc') {
      await transferWaxToMM(
        bsc,
        WaxToBSCBluChainId,
        'Smart Chain',
        'https://bscscan.com/tx/'
      );
    } else if (from === 'bsc' && to === 'wax') {
      await transferMMtoWax(bsc, BSCToWaxBluChainId);
    }

    setTransferState((currentState) => ({
      ...currentState,
      isProcessing: false,
    }));
  };

  const fetchBalance = useCallback(() => {
    const { from } = transferState;
    if (from === 'wax') {
      return wax.fetchBalance(eosTokenSymbol, eosTokenContract);
    }
    if (from === 'polygon') {
      return polygon.fetchBalance();
    }
    if (from === 'bsc') {
      return bsc.fetchBalance();
    }
  }, [wax, polygon, bsc, transferState]);

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
