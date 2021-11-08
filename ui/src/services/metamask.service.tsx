import Web3 from 'web3';

import { MetamaskError } from '../shared/enums/metamask-error.enum';
import { MetamaskChain } from '../shared/interfaces/metamask-chain';

class MetamaskService {
    web3 = null;
    address = '';

    constructor() {
    }

    connectWallet(chainId: string,
                successHandler: Function,
                failHandler: Function) {
        
        if (window.ethereum) {
            if (Number(window.ethereum.networkVersion) !== parseInt(chainId, 16)) {
                failHandler(MetamaskError.INVALID_NETWORK);
                return;
            }

            window.ethereum.request({ method: "eth_requestAccounts" }).then((accounts) => {
                this.address = (accounts[0]);
                this.web3  = new Web3(window.ethereum);
                successHandler(this.address);
            }).catch((err) => console.error(err))
        } else {
            failHandler(MetamaskError.NOT_INSTALLED);
        }
    }

    addChain(chain: MetamaskChain) {
        window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chain]
        }).catch((error: any) => {
            console.error(error)
        })
    }
}


const metamaskService = new MetamaskService();
export default metamaskService;