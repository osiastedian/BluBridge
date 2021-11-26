import { useEffect, useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { BsArrowRight } from 'react-icons/bs';
import { useTransfer } from '../context/transfer.context';
import { Log } from '../hooks/useLogger';
import WalletInfo from './WalletInfo';

interface BalanceState {
  amount: number;
  isFetching: boolean;
}

const TransferLogs = () => {
  const { transferLogs } = useTransfer();
  const getCssClass = (log: Log) => {
    if (log.type === 'success') {
      return 'text-success';
    }
    if (log.type === 'error') {
      return 'text-danger';
    }

    return 'text-muted';
  };
  if (transferLogs.length === 0) {
    return null;
  }
  return (
    <div className="mt-3">
      Transferring BLU tokens...
      <div className="font-size-14px">
        {transferLogs.map((log) => (
          <div key={log.message} className="d-flex align-items-center">
            <BsArrowRight className="mx-1" />
            <div
              className={getCssClass(log)}
              dangerouslySetInnerHTML={{ __html: log.message }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Transfer = () => {
  const {
    state,
    switchChains,
    isReadyForTransfer,
    updateAmount,
    transfer,
    fetchBalance,
  } = useTransfer();
  const { amount, from, to, isProcessing } = state;

  const [balance, setBalance] = useState<BalanceState>({
    amount: 0,
    isFetching: true,
  });

  useEffect(() => {
    if (!isReadyForTransfer) {
      return;
    }
    if (from) {
      setBalance((currentState) => ({ ...currentState, isFetching: true }));
      fetchBalance().then((amount) => {
        setBalance({ amount, isFetching: false });
      });
    }
  }, [isReadyForTransfer, from, setBalance, fetchBalance]);

  return (
    <main className={`mt-5 card p-5 border-0 rounded-16`}>
      <div className="d-flex justify-content-center align-items-center">
        <WalletInfo chain={from} label="From" />
        <div className="px-4">
          <div
            className="border shadow rounded-8 p-2 d-flex cursor-pointer"
            onClick={switchChains}
          >
            <BsArrowRight></BsArrowRight>
          </div>
        </div>
        <WalletInfo chain={to} label="To" />
      </div>
      {isReadyForTransfer && (
        <div className="mt-4">
          <span className="font-size-12px font-weight-bold text-primary">
            TOKEN AMOUNT
          </span>
          <FormControl
            className="my-2"
            type="number"
            value={amount}
            onChange={(e) => updateAmount(parseInt(e.target.value, 10))}
            placeholder="Input amount"
          />
          <button
            onClick={transfer}
            disabled={isProcessing}
            className="w-100 bg-primary btn text-white rounded shadow bg-primary"
          >
            {isProcessing ? 'Transferring...' : 'Transfer'}
          </button>
          {!balance.isFetching && (
            <span className="font-size-12px">
              {balance.amount} BLU tokens available
            </span>
          )}
          <TransferLogs />
        </div>
      )}
    </main>
  );
};

export default Transfer;
