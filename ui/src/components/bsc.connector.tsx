import { useEffect, useState } from 'react';
import { Image } from 'react-bootstrap';

import { useBSC } from '../context/bsc.context';
import { useMetamask } from '../context/metamask.context';
import { truncateAddress } from '../services/utils.service';
import { BSCMainnet } from '../shared/constants';
import ConnectToNetworkModal from './connect-to-network.modal';
import MissingMetamaskModal from './missing-metamask.modal';

export default function BSCConnector() {
  const { isInstalled, windowLoaded } = useMetamask();
  const { address, connect, isConnectedToBSC, addNetwork } = useBSC();

  const [showMetamaskMissing, setShowMetamaskMissing] = useState(false);
  const [showNotConnectedToBSC, setShowNotConnectedToBSC] = useState(false);

  useEffect(() => {
    if (windowLoaded) {
      setShowMetamaskMissing(!isInstalled);
      setShowNotConnectedToBSC(!isConnectedToBSC());
    }
  }, [isConnectedToBSC, isInstalled, windowLoaded]);

  return (
    <>
      <div className="text-center w-100">
        <Image src="/binance-logo.png" alt="" height="50" />
        <div className="mt-2 font-size-12px">Binance Smart Chain</div>
      </div>
      <div className="w-100">
        <button
          onClick={() => {
            if (isInstalled) {
              connect();
            } else {
              setShowMetamaskMissing(true);
            }
          }}
          disabled={!isConnectedToBSC}
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
      {!showMetamaskMissing && showNotConnectedToBSC && (
        <ConnectToNetworkModal
          onHide={() => setShowNotConnectedToBSC(false)}
          targetNetwork={BSCMainnet.chainName}
          addNetwork={() => {
            addNetwork().then(() => setShowNotConnectedToBSC(false));
          }}
        />
      )}
    </>
  );
}
