import { useState } from 'react';
import Web3 from 'web3';

import bludacToken from '../shared/abis/BluDacToken.json';
import polygonBridge from '../shared/abis/PolygonBridge.json';
import { MetamaskError } from '../shared/enums/metamask-error.enum';
import { MetamaskChain } from '../shared/interfaces/metamask-chain';
import { MetaMaskNetworkConfig } from '../shared/interfaces/metamask-network-config';
import { PolygonTransaction } from '../shared/interfaces/polygon-transaction';
import { addPrecision } from './utils.service';

const useMetaMask = () => {
  const bluBridgeContract = process.env.BLU_BRIDGER_CONTRACT;
  const bluTokenContract = process.env.BLU_TOKEN_CONTRACT;
  const [web3, setWeb3] = useState(null);
  const [address, setAddress] = useState();
  const bludacTokenAbi = bludacToken.abi;
  const polygonBridgeAbi = polygonBridge.abi;

  const addNetwork = (networkConfig: MetaMaskNetworkConfig) => {
    return window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkConfig],
    });
  };

  const switchEthChain = (networkConfig: MetaMaskNetworkConfig) => {
    return window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: networkConfig.chainId }],
    });
  };

  const isInstalled = typeof window !== 'undefined' && window.ethereum;

  const isCurrentNetwork = (config: MetaMaskNetworkConfig): boolean =>
    Number(window.ethereum.networkVersion) !== parseInt(config.chainId, 16);

  const requestAccount = (): Promise<string> => {
    return window.ethereum
      .request({ method: 'eth_requestAccounts' })
      .then((accounts) => accounts[0]);
  };

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

  const getCurrentAddress = async (): Promise<string> => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts === undefined) {
      throw 'Failed to get Metamask address.';
    }

    const walletAddress = accounts[0];
    setAddress(walletAddress);

    return walletAddress;
  };

  const balanceOf = async (): Promise<number> => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts === undefined) {
      return 0;
    }

    const walletAddress = accounts[0];
    setAddress(walletAddress);
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(
      bludacTokenAbi as any,
      bluTokenContract
    );

    let balance = await contract.methods.balanceOf(walletAddress).call();
    balance = web3.utils.fromWei(balance, 'ether');

    return balance;
  };

  const transfer = async (
    toAddress: string,
    toChainId: string,
    amount: number,
    updateTxLog: Function,
    precision = 4
  ): Promise<PolygonTransaction> => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts === undefined) {
      return null;
    }

    setAddress(accounts[0]);
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(
      polygonBridgeAbi as any,
      bluBridgeContract
    );

    const tokenContract = new web3.eth.Contract(
      bludacTokenAbi as any,
      bluTokenContract
    );

    updateTxLog(null, 'Waiting to approve spend amount for transaction.');
    const approveTx = await tokenContract.methods
      .approve(
        bluBridgeContract,
        web3.utils.toBN(
          web3.utils.toWei(addPrecision(amount, precision), 'ether')
        )
      )
      .send({ from: accounts[0] });

    updateTxLog(
      'Successfully approved spend amount for transaction.',
      'Waiting for approval to send BLU tokens to bridge.'
    );
    const sendTx: PolygonTransaction = await contract.methods
      .send(
        bluTokenContract,
        web3.utils.toBN(
          web3.utils.toWei(addPrecision(amount, precision), 'ether')
        ),
        Number(toChainId),
        web3.utils.asciiToHex(toAddress)
      )
      .send({ from: accounts[0] });

    updateTxLog(
      'Successfully sent BLU tokens to bridge.',
      'Waiting for approval to claim BLU tokens from target blockchain.'
    );

    return sendTx;
  };

  const claim = async (
    transferId: number,
    amount: number,
    chainId: number,
    signatures: string[]
  ): Promise<any> => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts === undefined) {
      throw 'Failed to claim tokens. Target account is undefined.';
    }

    const targetAddress = accounts[0];
    setAddress(targetAddress);
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(
      polygonBridgeAbi as any,
      bluBridgeContract
    );

    const encodedParams = encodeParameters(
      web3,
      transferId,
      web3.utils
        .toBN(web3.utils.toWei(addPrecision(amount, 4), 'ether'))
        .toString(),
      chainId,
      bluTokenContract,
      targetAddress
    );

    const claimTx = await contract.methods
      .claim(bluTokenContract, encodedParams, signatures)
      .send({ from: accounts[0] });

    return claimTx;
  };

  const encodeParameters = (
    web3: any,
    transferId: number,
    amountGwei: string,
    chainId: number,
    tokenAddress: string,
    toAddress: string
  ) => {
    if (
      !!!web3 ||
      !!!transferId ||
      !!!amountGwei ||
      !!!chainId ||
      !!!tokenAddress ||
      !!!toAddress
    ) {
      throw 'Failed to encode parameters, an invalid value was passed.';
    }

    return web3.eth.abi.encodeParameter(
      {
        ParentStruct: {
          propertyOne: 'uint64',
          propertyTwo: 'uint256',
          propertyThree: 'uint8',
          propertyFour: 'address',
          propertyFive: 'address',
        },
      },
      {
        propertyOne: transferId,
        propertyTwo: amountGwei,
        propertyThree: chainId,
        propertyFour: tokenAddress,
        propertyFive: toAddress,
      }
    );
  };

  return {
    web3,
    address,
    connectWallet,
    addChain,
    balanceOf,
    transfer,
    claim,
    encodeParameters,
    getCurrentAddress,
    switchEthChain,
    isCurrentNetwork,
    requestAccount,
    isInstalled,
    addNetwork,
  };
};

export default useMetaMask;
