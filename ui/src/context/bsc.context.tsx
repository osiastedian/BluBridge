import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { addPrecision } from '../services/utils.service';
import bludacTokenAbi from '../shared/abis/BluDacToken.json';
// TODO: recheck this ABI
import bridgeAbi from '../shared/abis/PolygonBridge.json';
import { BSCMainnet } from '../shared/constants';
// TODO: check if this should be renamed to MetamaskTransaction
import { PolygonTransaction } from '../shared/interfaces/polygon-transaction';
import { useMetamask } from './metamask.context';

const bluTokenContract = process.env.BLU_TOKEN_CONTRACT_BSC;
const bluBridgeContract = process.env.BLU_BRIDGER_CONTRACT_BSC;

export interface BSCContextProps {
  address: string;
  isConnectedToBSC: () => boolean;
  connect: () => void;
  addNetwork: () => Promise<boolean>;
  fetchBalance: () => Promise<number>;
  claim: (
    address: string,
    transferId: number,
    amount: number,
    chainId: number,
    signatures: string[]
  ) => Promise<string>;
  approve: (
    from: string,
    amount: number,
    precision?: number
  ) => Promise<string>;
  bridgeSend: (
    from: string,
    toAddress: string,
    toChainId: string,
    amount: number,
    precision?: number
  ) => Promise<number>;
}

const BSCContext = createContext<Partial<BSCContextProps>>({});

export const useBSC = () => useContext(BSCContext);

const BSCContextProvider: React.FC = ({ children }) => {
  const metaMask = useMetamask();
  const [address, setAddress] = useState<string | undefined>();

  const connect = useCallback(() => {
    metaMask.getCurrentAddress().then(setAddress);
  }, [metaMask]);

  const isConnectedToBSC = useCallback(
    () => metaMask.isCurrentNetwork(BSCMainnet),
    [metaMask]
  );

  const addNetwork = () => {
    return metaMask.addNetwork(BSCMainnet);
  };

  const fetchBalance = async () => {
    const balance = await metaMask.balanceOf(
      address,
      bludacTokenAbi.abi,
      bluTokenContract
    );
    return parseInt(balance, 10);
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

  const claim = async (
    address: string,
    transferId: number,
    amount: number,
    chainId: number,
    signatures: string[]
  ): Promise<string> => {
    const { web3 } = metaMask;
    const contract = new web3.eth.Contract(
      bridgeAbi.abi as any,
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
      address
    );

    const claimTx: { transactionHash: string } = await contract.methods
      .claim(bluTokenContract, encodedParams, signatures)
      .send({ from: address });

    return claimTx.transactionHash;
  };

  const approve = async (
    from: string,
    amount: number,
    precision = 4
  ): Promise<string> => {
    const tokenContract = metaMask.getContract(
      bludacTokenAbi.abi as any,
      bluTokenContract
    );
    const approveTx = await tokenContract.methods
      .approve(
        bluBridgeContract,
        metaMask.web3.utils.toBN(
          metaMask.web3.utils.toWei(addPrecision(amount, precision), 'ether')
        )
      )
      .send({ from });
    return approveTx.transactionHash;
  };

  const bridgeSend = async (
    from: string,
    toAddress: string,
    toChainId: string,
    amount: number,
    precision: number = 4
  ): Promise<number> => {
    const { web3 } = metaMask;
    const bridgeContract = metaMask.getContract(
      bridgeAbi.abi as any,
      bluBridgeContract
    );
    const sendTx: PolygonTransaction = await bridgeContract.methods
      .send(
        bluTokenContract,
        web3.utils.toBN(
          web3.utils.toWei(addPrecision(amount, precision), 'ether')
        ),
        Number(toChainId),
        web3.utils.asciiToHex(toAddress)
      )
      .send({ from });
    return sendTx.blockNumber;
  };

  useEffect(() => {
    if (metaMask.isInstalled) {
      if (!isConnectedToBSC()) {
        console.log('wa');
        // TODO: Switch to Mainnet
        metaMask.switchNetwork(BSCMainnet);
      } else {
        connect();
      }
    }
  }, [metaMask, connect, isConnectedToBSC]);

  return (
    <BSCContext.Provider
      value={{
        address,
        isConnectedToBSC,
        connect,
        addNetwork,
        fetchBalance,
        claim,
        approve,
        bridgeSend,
      }}
    >
      {children}
    </BSCContext.Provider>
  );
};

export default BSCContextProvider;