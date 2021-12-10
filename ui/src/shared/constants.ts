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

export const BSCMainnet = {
  chainId: '0x38',
  chainName: 'Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com'],
};

export const BSCTestNet = {
  chainId: '0x61',
  chainName: 'Binance Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-2-s2.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
};

export enum Connector {
  WAX = 'WAX',
  POLYGON = 'POLYGON',
}

export const PolygonToWaxBluChainId = '1';
export const WaxToPolygonBluChainId = 2;

// TODO: recheck if this is correct
export const BSCToWaxBluChainId = '1';
export const WaxToBSCBluChainId = 2;
