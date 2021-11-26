import Head from 'next/head';

import styles from '../../styles/Home.module.scss';
import Nav from '../components/navigation';
import MetamaskContextProvider from '../context/metamask.context';
import PolygonContextProvider from '../context/polygon.context';
import WaxContextProvider from '../context/wax.context';
import Transfer from '../components/Transfer';
import TransferContextProvider from '../context/transfer.context';
import DfuseContextProvider from '../context/dfuse.context';

export default function Home() {
  return (
    <DfuseContextProvider>
      <MetamaskContextProvider>
        <PolygonContextProvider>
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
        </PolygonContextProvider>
      </MetamaskContextProvider>
    </DfuseContextProvider>
  );
}
