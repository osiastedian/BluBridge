import { useState } from 'react';

import metamaskService from '../services/metamask.service';
import { truncateAddress } from '../services/utils.service';
import { PolygonMainnet } from '../shared/constants';
import { MetamaskError } from '../shared/enums/metamask-error.enum';
import ConnectMetamaskModal from './connect-metamask.modal';
import ConnectNetworkModal from './connect-network.modal';

export default function PolygonConnector() {
    const [address, setAddress] = useState('');
    
    const [showMMError, setShowMMError] = useState(false);
    const closeMMError = () => setShowMMError(false);

    const [showNetworkError, setNetworkError] = useState(false);
    const closeNetworkError = () => setNetworkError(false);

    const onConnect = () => {
        metamaskService.connectWallet(
            PolygonMainnet.chainId,
            (address: string) => {
                setAddress(address);
            },
            (error: MetamaskError) => {
                console.log(error);
                if (error === MetamaskError.INVALID_NETWORK) {
                    setNetworkError(true);
                } else if (error === MetamaskError.NOT_INSTALLED) {
                    setShowMMError(true);
                }
            }
        );
    }

    return (
        <>
            <div className="text-center w-100">
                <img src="/matic-logo.png" alt="" height="50" />
                <div className="mt-2 font-size-12px">
                    Polygon
                </div>
            </div>
            <div className="w-100">
                <button 
                onClick={onConnect}
                className="w-100 bg-primary btn text-white rounded shadow mt-3 bg-primary">
                    { address ? `Connected as ${truncateAddress(address)}` : 'Connect'  }
                </button>
            </div>
            {showMMError && <ConnectMetamaskModal onHide={closeMMError}></ConnectMetamaskModal>}
            {showNetworkError && <ConnectNetworkModal onHide={closeNetworkError} targetNetwork={PolygonMainnet.chainName} addNetwork={() => {metamaskService.addChain(PolygonMainnet);closeNetworkError();onConnect();}}></ConnectNetworkModal>}
        </>
    );
}