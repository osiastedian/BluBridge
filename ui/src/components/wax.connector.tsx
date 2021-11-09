import { useState } from 'react';
import { Image } from 'react-bootstrap';

import waxService from '../services/wax.service';

export default function WaxConnector() {
  const [accountName, setAccountName] = useState('');

  const onConnect = () => {
    waxService.login(() => {
      setAccountName(waxService.accountName);
    });
  };

  return (
    <>
      <div className='text-center w-100'>
        <Image src='/wax-logo.svg' alt='' height='50' />
        <div className='mt-2 font-size-12px'>Wax Cloud Wallet</div>
      </div>
      <div className='w-100'>
        <button
          onClick={onConnect}
          className='w-100 bg-primary btn text-white rounded shadow mt-3 bg-primary'
        >
          {accountName ? `Connected as ${accountName}` : 'Connect'}
        </button>
      </div>
    </>
  );
}
