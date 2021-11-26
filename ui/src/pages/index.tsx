import Head from 'next/head';
import { useState } from 'react';
import { FormControl } from 'react-bootstrap';
import { BsArrowRight } from 'react-icons/bs';

import styles from '../../styles/Home.module.scss';
import Nav from '../components/navigation';
import PolygonConnector from '../components/polygon.connector';
import WaxConnector from '../components/wax.connector';
import MetamaskContextProvider from '../context/metamask.context';
import PolygonContextProvider from '../context/polygon.context';
import WaxContextProvider from '../context/wax.context';
import { WalletContext } from '../context/wallet.context';
import WalletService from '../services/wallet.service';
import { Connector } from '../shared/constants';
import Transfer from '../components/Transfer';
import TransferContextProvider from '../context/transfer.context';
import DfuseContextProvider from '../context/dfuse.context';

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
    <DfuseContextProvider>
      <MetamaskContextProvider>
        <PolygonContextProvider>
          <WaxContextProvider>
            <TransferContextProvider>
              <Nav />
              <WalletContext.Provider
                value={{ fromConnector, toConnector, setFrom, setTo }}
              >
                <div className={styles.homeWrapper}>
                  <div className="container">
                    <Head>
                      <title>BluDAC Bridge</title>
                      <meta name="description" content="BluDAC Bridge" />
                      <link rel="icon" href="/bludac-logo.png" />
                    </Head>
                    <div className="row m-0">
                      <div className="col-md-3"></div>
                      <div className="col-md-6">
                        <Transfer />
                      </div>
                      <div className="col-md-3"></div>
                    </div>
                  </div>
                </div>
              </WalletContext.Provider>
            </TransferContextProvider>
          </WaxContextProvider>
        </PolygonContextProvider>
      </MetamaskContextProvider>
    </DfuseContextProvider>
  );
}
