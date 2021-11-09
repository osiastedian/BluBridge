import Head from 'next/head';
import { useState } from 'react';
import { BsArrowRight } from 'react-icons/bs';

import styles from '../../styles/Home.module.scss';
import Nav from '../components/navigation';
import PolygonConnector from '../components/polygon.connector';
import WaxConnector from '../components/wax.connector';

export default function Home() {
  const [fromConnector, setFrom] = useState(<WaxConnector></WaxConnector>);
  const [toConnector, setTo] = useState(<PolygonConnector></PolygonConnector>);

  const switchConnectors = () => {
    const fromRef = fromConnector;
    setFrom(toConnector);
    setTo(fromRef);
  };

  return (
    <>
      <Nav></Nav>
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
                      {fromConnector}
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
                      {toConnector}
                    </div>
                  </div>
                </div>
              </main>
            </div>
            <div className='col-md-3'></div>
          </div>
        </div>
      </div>
    </>
  );
}
