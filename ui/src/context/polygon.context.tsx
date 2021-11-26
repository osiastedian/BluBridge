import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { addPrecision } from '../services/utils.service';

import bludacToken from '../shared/abis/BluDacToken.json';
import bridgeAbi from '../shared/abis/PolygonBridge.json';

import { PolygonMainnet } from '../shared/constants';
import { useMetamask } from './metamask.context';

const bluTokenContract = process.env.BLU_TOKEN_CONTRACT;
const bluBridgeContract = process.env.BLU_BRIDGER_CONTRACT;

interface PolygonContextProps {
  address: string;
  isConnectedToPolygon: () => boolean;
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
}

const PolygonContext = createContext<Partial<PolygonContextProps>>({});

export const usePolygon = () => useContext(PolygonContext);

const PolygonContextProvider: React.FC = ({ children }) => {
  const metaMask = useMetamask();
  const [address, setAddress] = useState<string | undefined>();

  const connect = useCallback(() => {
    metaMask.getCurrentAddress().then(setAddress);
  }, [metaMask]);

  const isConnectedToPolygon = useCallback(
    () => metaMask.isCurrentNetwork(PolygonMainnet),
    [metaMask]
  );

  const addNetwork = () => {
    return metaMask.addNetwork(PolygonMainnet);
  };

  const fetchBalance = async () => {
    const balance = await metaMask.balanceOf(
      address,
      bludacToken.abi,
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

  useEffect(() => {
    if (!isConnectedToPolygon) {
      metaMask.switchNetwork(PolygonMainnet);
    } else {
      connect();
    }
  }, [metaMask, connect, isConnectedToPolygon]);

  return (
    <PolygonContext.Provider
      value={{
        address,
        isConnectedToPolygon,
        connect,
        addNetwork,
        fetchBalance,
        claim,
      }}
    >
      {children}
    </PolygonContext.Provider>
  );
};

export default PolygonContextProvider;
