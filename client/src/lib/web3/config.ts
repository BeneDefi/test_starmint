import { createConfig, http } from 'wagmi';
import { base, mainnet, optimism } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { sdk } from '@farcaster/miniapp-sdk';

// Base network configuration
export const BASE_CHAIN_ID = 8453;

// Wagmi configuration for Base and other chains
export const wagmiConfig = createConfig({
  chains: [base, mainnet, optimism],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [mainnet.id]: http(),
    [optimism.id]: http(),
  },
  connectors: [
    farcasterMiniApp()
  ],
});

// Get Ethereum provider from MiniKit
export const getEthereumProvider = async () => {
  try {
    return await sdk.wallet.getEthereumProvider();
  } catch (error) {
    console.error('Failed to get Ethereum provider:', error);
    return null;
  }
};

// Base network details
export const BASE_NETWORK = {
  chainId: BASE_CHAIN_ID,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org',
};