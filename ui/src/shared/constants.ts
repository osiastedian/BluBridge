export const PolygonMainnet = {
  chainId: '0x89',
  chainName: 'Matic Mainnet',
  nativeCurrency: {
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-mainnet.maticvigil.com'],
  blockExplorerUrls: ['https://explorer.matic.network'],
};

export const PolygonTestNet = {
  chainId: '0x13881',
  chainName: 'Polygon Testnet',
  nativeCurrency: {
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://matic-mumbai.chainstacklabs.com/'],
  blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
};

export enum Connector {
  WAX = 'WAX',
  POLYGON = 'POLYGON',
}

export const PolygonToWaxBluChainId = '1';
export const WaxToPolygonBluChainId = 2;
