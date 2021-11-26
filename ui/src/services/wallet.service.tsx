/* eslint-disable react-hooks/rules-of-hooks */
import {
  Connector,
  PolygonToWaxBluChainId,
  WaxToPolygonBluChainId,
} from '../shared/constants';
import { PolygonTransaction } from '../shared/interfaces/polygon-transaction';
import { ReceiveDataRow } from '../shared/interfaces/wax-receive-data';
import { TransferDataRow } from '../shared/interfaces/wax-transfer-data';
import { DfuseService } from './dfuse.service';
import useMetaMask from './metamask.service';
import { hexToPrependedZeros } from './utils.service';
import waxService from './wax.service';

export default class WalletService {
  metamask = useMetaMask();
  dfuse = new DfuseService();

  async getAddress(connector: Connector): Promise<string> {
    switch (connector) {
      case Connector.WAX:
        return waxService.accountName;
      case Connector.POLYGON:
        const address = await this.metamask.getCurrentAddress();
        return address;
      default:
        return null;
    }
  }

  async transfer(
    fromConnector: Connector,
    toConnector: Connector,
    amount: number,
    updateTxLog: Function
  ): Promise<number> {
    const toAddress = await this.getAddress(toConnector);

    switch (fromConnector) {
      case Connector.WAX:
        updateTxLog(
          null,
          `Waiting for approval from Wax Wallet to transfer to bridge.`
        );

        const transferToBridger = await waxService.transfer(
          'BLU',
          'bludactokens',
          'blubridgerv1',
          amount
        );

        // throw 'Error123';

        updateTxLog(
          `Successfully transferred ${amount} BLU to bridge.`,
          'Waiting for approval to transfer to Polygon'
        );
        const sendToEth = await waxService.sendToEth(
          'BLU',
          'blubridgerv1',
          WaxToPolygonBluChainId,
          hexToPrependedZeros(toAddress),
          amount
        );

        updateTxLog(
          'Successfully submitted transaction (Transfer BLU to Polygon)'
        );

        return null;
      case Connector.POLYGON:
        const transferTx: PolygonTransaction = await this.metamask.transfer(
          toAddress,
          PolygonToWaxBluChainId,
          amount,
          updateTxLog
        );

        return transferTx.blockNumber;
      default:
        return null;
    }
  }

  async getBalance(fromConnector: Connector): Promise<number> {
    switch (fromConnector) {
      case Connector.WAX:
        return await waxService.fetchBalance('BLU', 'bludactokens');
      case Connector.POLYGON:
        return await this.metamask.balanceOf();
      default:
        return 0;
    }
  }

  async listenAndClaim(
    amount: number,
    fromConnector: Connector,
    toConnector: Connector,
    updateTxLog: Function,
    claimId?: number
  ): Promise<void> {
    //
    // WAX => POLYGON
    if (fromConnector === Connector.WAX && toConnector === Connector.POLYGON) {
      const fromAddress = await this.getAddress(fromConnector);
      const listenToLogSend: Promise<number> = new Promise(
        (resolve, reject) => {
          updateTxLog('Confirming Bridge to Polygon transaction.');
          this.dfuse.listenToLogsendTx(fromAddress, (id: number) => {
            resolve(id);
          });

          setTimeout(() => {
            reject(new Error('Timeout'));
          }, 300000);
        }
      );

      const transferId = await listenToLogSend;

      if (transferId && typeof transferId !== 'number') {
        throw 'Transaction failed. Invalid transfer ID.';
      }

      updateTxLog(
        null,
        'Signing transaction and confirming transaction validity.'
      );
      const tableRow: TransferDataRow = await waxService.listenToTableInfo(
        transferId
      );

      if (tableRow === null || tableRow.signatures.length !== 4) {
        throw 'Failed to confirm transaction validity, signatures not found.';
      }

      updateTxLog(
        'Successfully confirmed transaction',
        'Waiting for approval to claim BLU tokens on Polygon'
      );
      const claimTx: PolygonTransaction = await this.metamask.claim(
        transferId,
        amount,
        WaxToPolygonBluChainId,
        tableRow.signatures
      );

      updateTxLog(
        `Successfully submitted transaction to claim tokens. <a href="https://polygonscan.com/tx/${claimTx.transactionHash}" target="_blank">View transaction</a>`,
        ''
      );
    }

    //
    // POLYGON TO WAX
    if (fromConnector === Connector.POLYGON && toConnector === Connector.WAX) {
      const receiveData: ReceiveDataRow = await waxService.getReceiveData(
        claimId
      );

      if (receiveData.oracles.length === 0) {
        throw 'Failed to confirm transaction, no oracles assigned.';
      }

      updateTxLog(
        `Successfully verified receive transaction validity ID: ${receiveData.id}`,
        `Waiting for approval from Wax Wallet to receive tokens.`
      );

      const claim = await waxService.claim('blubridgerv1', receiveData.id);
      updateTxLog(
        `Successfully submitted transaction to claim tokens.`,
        'Waiting for approval to withdraw your tokens from the bridge.'
      );

      const withdraw = await waxService.withdraw('blubridgerv1');
      updateTxLog(
        `Successfully submitted transaction to withdraw tokens. <a href="https://wax.bloks.io/transaction/${withdraw.transaction_id}" target="_blank">View transaction</a>`,
        ''
      );
    }
  }
}
