import { useContext, useState } from 'react';
import { Image } from 'react-bootstrap';

import { WalletContext } from '../context/wallet.context';
import useMetaMask from '../services/metamask.service';
import { truncateAddress } from '../services/utils.service';
import { Connector, PolygonMainnet } from '../shared/constants';
import { MetamaskError } from '../shared/enums/metamask-error.enum';
import ConnectToNetworkModal from './connect-to-network.modal';
import MissingMetamaskModal from './missing-metamask.modal';

export default function PolygonConnector() {
  const metamask = useMetaMask();
  const { fromConnector, toConnector, setFrom, setTo } =
    useContext(WalletContext);

  const [showMMError, setShowMMError] = useState(false);
  const closeMMError = () => setShowMMError(false);

  const [showNetworkError, setNetworkError] = useState(false);
  const closeNetworkError = () => setNetworkError(false);

  const onConnect = () =>
    metamask.connectWallet(
      PolygonMainnet.chainId,
      (address: string) => {
        console.log(`Connected to Metamask ${address}`);

        if (fromConnector.id === Connector.POLYGON) {
          setFrom({ ...fromConnector, connected: true });
        } else if (toConnector.id === Connector.POLYGON) {
          setTo({ ...toConnector, connected: true });
        }
      },
      (error: MetamaskError) => {
        console.error(error);
        if (error === MetamaskError.INVALID_NETWORK) {
          setNetworkError(true);
        } else if (error === MetamaskError.NOT_INSTALLED) {
          setShowMMError(true);
        }
      }
    );

  return (
    <>
      <div className='text-center w-100'>
        <Image src='/matic-logo.png' alt='' height='50' />
        <div className='mt-2 font-size-12px'>Polygon</div>
      </div>
      <div className='w-100'>
        <button
          onClick={onConnect}
          className='w-100 bg-primary btn text-white rounded shadow mt-3 bg-primary'
        >
          {metamask.address
            ? `Connected as ${truncateAddress(metamask.address)}`
            : 'Connect'}
        </button>
      </div>
      {showMMError && (
        <MissingMetamaskModal onHide={closeMMError}></MissingMetamaskModal>
      )}
      {showNetworkError && (
        <ConnectToNetworkModal
          onHide={closeNetworkError}
          targetNetwork={PolygonMainnet.chainName}
          addNetwork={() => {
            metamask.addChain(PolygonMainnet);
            closeNetworkError();
            onConnect;
          }}
        ></ConnectToNetworkModal>
      )}
    </>
  );
}
