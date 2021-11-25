import Head from 'next/head';
import { useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { BsArrowRight } from 'react-icons/bs';

import styles from '../../styles/Home.module.scss';
import Nav from '../components/navigation';
import PolygonConnector from '../components/polygon.connector';
import WaxConnector from '../components/wax.connector';
import { WalletContext } from '../context/wallet.context';
import WalletService from '../services/wallet.service';
import { Connector } from '../shared/constants';

export default function Home() {
  const wallet = new WalletService();

  const [fromConnector, setFrom] = useState({
    id: Connector.WAX,
    component: <WaxConnector></WaxConnector>,
    connected: false,
    balance: -1,
  });
  const [toConnector, setTo] = useState({
    id: Connector.POLYGON,
    component: <PolygonConnector></PolygonConnector>,
    connected: false,
    balance: -1,
  });
  const [amount, setAmount] = useState(0);
  const [txLog, setTxLog] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorLog, setErrorLog] = useState([]);

  const handleAmountChange = (element: any) => setAmount(element.target.value);

  const updateTxLog = (
    successMsg: string,
    loadingMessage: string,
    errorMsg: string
  ) => {
    if (successMsg !== undefined && successMsg !== null) {
      setTxLog((prevLog) => [...prevLog, successMsg]);
    }

    if (loadingMessage !== undefined && loadingMessage !== null) {
      setLoadingMsg(loadingMessage);
    }

    if (errorMsg !== undefined && errorMsg !== null) {
      setErrorLog((prevLog) => [...prevLog, errorMsg]);
      setLoadingMsg('');
    }
  };

  const switchConnectors = () => {
    if (loadingMsg !== '') {
      return;
    }

    const fromRef = fromConnector;
    setFrom(toConnector);
    setTo(fromRef);
    resetState();
  };

  const fromWalletBalance = async () => {
    if (fromConnector.balance === -1) {
      const fromBalance = await wallet.getBalance(fromConnector.id);
      setFrom({ ...fromConnector, balance: fromBalance });
    }
  };

  const transfer = async () => {
    resetState();

    if (amount == null || amount < 0 || amount > fromConnector.balance) {
      setErrorLog((prevLog) => [...prevLog, 'Please input a valid amount.']);
      return;
    }

    try {
      const transferTxId = await wallet.transfer(
        fromConnector.id,
        toConnector.id,
        amount,
        updateTxLog
      );

      wallet.listenAndClaim(
        amount,
        fromConnector.id,
        toConnector.id,
        updateTxLog,
        transferTxId
      );
    } catch (error) {
      console.error(error);
      let errorMsg: string = error;
      if (typeof error !== 'string') {
        errorMsg = 'Something went wrong. Please try again or contact admin.';
      }
      setErrorLog((prevLog) => [...prevLog, errorMsg]);
      setLoadingMsg('');
    }
  };

  const resetState = () => {
    setTxLog(new Array());
    setLoadingMsg('');
    setErrorLog(new Array());
  };

  return (
    <>
      <Nav></Nav>
      <WalletContext.Provider
        value={{ fromConnector, toConnector, setFrom, setTo }}
      >
        <div className={styles.homeWrapper}>
          <div className='container'>
            <Head>
              <title>BluDAC Bridge</title>
              <meta name='description' content='BluDAC Bridge' />
              <link rel='icon' href='/bludac-logo.png' />
            </Head>
            <div className='row m-0'>
              <div className='col-md-3'></div>
              <div className='col-md-6'>
                <main className={`mt-5 card p-5 border-0 rounded-16`}>
                  <div className='d-flex justify-content-center align-items-center'>
                    <div className='w-100'>
                      <span className='font-size-12px font-weight-bold text-primary'>
                        FROM
                      </span>
                      <div className='border rounded-8 w-100 p-4 mt-2'>
                        {fromConnector.component}
                      </div>
                    </div>
                    <div className='px-4'>
                      <div
                        className='border shadow rounded-8 p-2 d-flex cursor-pointer'
                        onClick={switchConnectors}
                      >
                        <BsArrowRight></BsArrowRight>
                      </div>
                    </div>
                    <div className='w-100'>
                      <span className='font-size-12px font-weight-bold text-primary'>
                        TO
                      </span>
                      <div className='border rounded-8 w-100 p-4 mt-2'>
                        {toConnector.component}
                      </div>
                    </div>
                  </div>
                  {fromConnector.connected && toConnector.connected && (
                    <div className='mt-4'>
                      <span className='font-size-12px font-weight-bold text-primary'>
                        TOKEN AMOUNT
                      </span>
                      <FormControl
                        className='my-2'
                        type='number'
                        onChange={handleAmountChange}
                        placeholder='Input amount'
                      />
                      <button
                        onClick={transfer}
                        disabled={loadingMsg !== ''}
                        className='w-100 bg-primary btn text-white rounded shadow bg-primary'
                      >
                        {loadingMsg !== '' ? 'Transferring...' : 'Transfer'}
                      </button>
                      {fromWalletBalance() && fromConnector.balance !== -1 && (
                        <span className='font-size-12px'>
                          {fromConnector.balance} BLU tokens available
                        </span>
                      )}

                      {(txLog.length > 0 || loadingMsg !== '') && (
                        <div className='mt-3'>
                          Transferring BLU tokens...
                          <div className='font-size-14px text-success'>
                            {txLog.map((msg) => (
                              <div
                                key={msg}
                                className='d-flex align-items-center'
                              >
                                <BsArrowRight className='mx-1'></BsArrowRight>
                                <div
                                  dangerouslySetInnerHTML={{ __html: msg }}
                                ></div>
                              </div>
                            ))}
                          </div>
                          {loadingMsg !== '' && (
                            <div className='font-size-14px text-muted'>
                              <i>{loadingMsg}</i>
                            </div>
                          )}
                        </div>
                      )}

                      <div className='font-size-14px text-danger'>
                        {errorLog.map((msg) => (
                          <div key={msg} className='d-flex align-items-center'>
                            <BsArrowRight className='mx-1'></BsArrowRight>
                            {msg} <br />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </main>
              </div>
              <div className='col-md-3'></div>
            </div>
          </div>
        </div>
      </WalletContext.Provider>
    </>
  );
}
