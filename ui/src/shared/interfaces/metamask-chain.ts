export interface MetamaskChain {
    chainId:           string;
    chainName:         string;
    nativeCurrency:    NativeCurrency;
    rpcUrls:           string[];
    blockExplorerUrls: string[];
}

export interface NativeCurrency {
    name:     string;
    symbol:   string;
    decimals: number;
}
