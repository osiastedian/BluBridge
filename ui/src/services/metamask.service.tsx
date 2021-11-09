import { useState } from 'react';
import Web3 from 'web3';

import { MetamaskError } from '../shared/enums/metamask-error.enum';
import { MetamaskChain } from '../shared/interfaces/metamask-chain';

const useMetaMask = () => {
  const [web3, setWeb3] = useState(null);
  const [address, setAddress] = useState();

  const connectWallet = (
    chainId: string,
    successHandler: Function,
    failHandler: Function
  ) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      if (Number(window.ethereum.networkVersion) !== parseInt(chainId, 16)) {
        failHandler(MetamaskError.INVALID_NETWORK);
        return;
      }

      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((accounts) => {
          setAddress(accounts[0]);
          setWeb3(new Web3(window.ethereum));
          successHandler(accounts[0]);
        })
        .catch((err) => console.error(err));
    } else {
      failHandler(MetamaskError.NOT_INSTALLED);
    }
  };

  const addChain = (chain: MetamaskChain) => {
    window.ethereum
      .request({
        method: 'wallet_addEthereumChain',
        params: [chain],
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  return { web3, address, connectWallet, addChain };
};

export default useMetaMask;
