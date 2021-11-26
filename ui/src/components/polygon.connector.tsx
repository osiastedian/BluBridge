import { useEffect, useState } from 'react';
import { Image } from 'react-bootstrap';
import { useMetamask } from '../context/metamask.context';
import { usePolygon } from '../context/polygon.context';

import { truncateAddress } from '../services/utils.service';
import { PolygonMainnet } from '../shared/constants';
import ConnectToNetworkModal from './connect-to-network.modal';
import MissingMetamaskModal from './missing-metamask.modal';

export default function PolygonConnector() {
  const { isInstalled, windowLoaded } = useMetamask();
  const { address, connect, isConnectedToPolygon, addNetwork } = usePolygon();

  const [showMetamaskMissing, setShowMetamaskMissing] = useState(false);
  const [showNotConnectedToPolygon, setShowNotConnectedToPolygon] =
    useState(false);

  useEffect(() => {
    if (windowLoaded) {
      setShowMetamaskMissing(!isInstalled);
      setShowNotConnectedToPolygon(!isConnectedToPolygon());
    }
  }, [isConnectedToPolygon, isInstalled, windowLoaded]);

  return (
    <>
      <div className="text-center w-100">
        <Image src="/matic-logo.png" alt="" height="50" />
        <div className="mt-2 font-size-12px">Polygon</div>
      </div>
      <div className="w-100">
        <button
          onClick={connect}
          disabled={!isConnectedToPolygon}
          className="w-100 bg-primary btn text-white rounded shadow mt-3 bg-primary"
        >
          {address ? `Connected as ${truncateAddress(address)}` : 'Connect'}
        </button>
      </div>
      {showMetamaskMissing && (
        <MissingMetamaskModal
          onHide={() => setShowMetamaskMissing(false)}
        ></MissingMetamaskModal>
      )}
      {!showMetamaskMissing && !showNotConnectedToPolygon && (
        <ConnectToNetworkModal
          onHide={() => setShowNotConnectedToPolygon(false)}
          targetNetwork={PolygonMainnet.chainName}
          addNetwork={() => {
            addNetwork().then(() => setShowNotConnectedToPolygon(false));
          }}
        />
      )}
    </>
  );
}
