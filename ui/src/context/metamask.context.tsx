import { createContext, useContext, useEffect, useState } from 'react';
import Web3 from 'web3';
import { MetaMaskNetworkConfig } from '../shared/interfaces/metamask-network-config';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

interface MetamaskContextProps {
  windowLoaded: boolean;
  isInstalled: boolean;
  web3: Web3;
  addNetwork: (networkConfig: MetaMaskNetworkConfig) => Promise<boolean>;
  switchNetwork: (networkConfig: MetaMaskNetworkConfig) => Promise<boolean>;
  isCurrentNetwork: (networkConfig: MetaMaskNetworkConfig) => boolean;
  getCurrentAddress: () => Promise<string>;
  balanceOf: (
    address: string,
    tokenAbi: any,
    tokenContract: string
  ) => Promise<string>;
  getContract: (abi: AbiItem, address: string) => Contract;
}

const MetamaskContext = createContext<Partial<MetamaskContextProps>>({});

export const useMetamask = () => useContext(MetamaskContext);

const MetamaskContextProvider: React.FC = ({ children }) => {
  const [windowLoaded, setWindowLoaded] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);
  const [web3, setWeb3] = useState<Web3 | null>(null);

  const addNetwork = (networkConfig: MetaMaskNetworkConfig) => {
    return window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkConfig],
    });
  };

  const switchNetwork = (networkConfig: MetaMaskNetworkConfig) => {
    return window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: networkConfig.chainId }],
    });
  };

  const getCurrentAddress = async (): Promise<string> => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts === undefined) {
      throw 'Failed to get Metamask address.';
    }
    const walletAddress = accounts[0];
    return walletAddress;
  };

  const isCurrentNetwork = (config: MetaMaskNetworkConfig): boolean =>
    typeof window !== 'undefined' &&
    Number(window.ethereum.networkVersion) !== parseInt(config.chainId, 16);

  const balanceOf = async (
    address: string,
    tokenAbi: any,
    tokenContract: string
  ): Promise<string> => {
    const contract = new web3.eth.Contract(tokenAbi, tokenContract);

    let balance = await contract.methods.balanceOf(address).call();
    balance = web3.utils.fromWei(balance, 'ether');

    return balance;
  };

  const getContract = (abi: AbiItem, address: string): Contract => {
    return new web3.eth.Contract(abi, address);
  };

  useEffect(() => {
    window.onload = () => {
      setWindowLoaded(true);
      setIsInstalled(Boolean(typeof window !== 'undefined' && window.ethereum));
      setWeb3(new Web3(window.ethereum));
    };
  }, []);

  return (
    <MetamaskContext.Provider
      value={{
        windowLoaded,
        isInstalled,
        web3,
        addNetwork,
        switchNetwork,
        getCurrentAddress,
        isCurrentNetwork,
        balanceOf,
        getContract,
      }}
    >
      {children}
    </MetamaskContext.Provider>
  );
};

export default MetamaskContextProvider;
