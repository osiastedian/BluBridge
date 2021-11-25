import { useContext, useState } from 'react';
import { Image } from 'react-bootstrap';

import { WalletContext } from '../context/wallet.context';
import waxService from '../services/wax.service';
import { Connector } from '../shared/constants';

export default function WaxConnector() {
  const [accountName, setAccountName] = useState('');
  const { fromConnector, toConnector, setFrom, setTo } =
    useContext(WalletContext);

  const onConnect = () => {
    waxService.login(() => {
      setAccountName(waxService.accountName);
      if (fromConnector.id === Connector.WAX) {
        setFrom({ ...fromConnector, connected: true });
      } else if (toConnector.id === Connector.WAX) {
        setTo({ ...toConnector, connected: true });
      }
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
