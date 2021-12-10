import Head from 'next/head';

import styles from '../../styles/Home.module.scss';
import Nav from '../components/navigation';
import Transfer from '../components/Transfer';
import BSCContextProvider from '../context/bsc.context';
import DfuseContextProvider from '../context/dfuse.context';
import MetamaskContextProvider from '../context/metamask.context';
import PolygonContextProvider from '../context/polygon.context';
import TransferContextProvider from '../context/transfer.context';
import WaxContextProvider from '../context/wax.context';

export default function Home() {
  return (
    <DfuseContextProvider>
      <MetamaskContextProvider>
        <PolygonContextProvider>
          <BSCContextProvider>
            <WaxContextProvider>
              <TransferContextProvider>
                <Nav />
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
              </TransferContextProvider>
            </WaxContextProvider>
          </BSCContextProvider>
        </PolygonContextProvider>
      </MetamaskContextProvider>
    </DfuseContextProvider>
  );
}
