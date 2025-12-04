import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { customFarcasterConnector } from '../../utils/farcasterConnector';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [customFarcasterConnector()],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
});

// ✅ ScoreNFT contract deployed on Base mainnet
// Contract verified on BaseScan: https://basescan.org/address/0xE6729F7BCefc2d45da01C0b9FB10Ac2f644FBF1e
export const SCORE_NFT_CONTRACT_ADDRESS = '0xE6729F7BCefc2d45da01C0b9FB10Ac2f644FBF1e' as const;

export const SCORE_NFT_ABI = [
  {
    name: 'mintScore',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'score', type: 'uint256' },
      { name: 'level', type: 'uint256' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    name: 'getScoreData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'score', type: 'uint256' },
          { name: 'level', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'player', type: 'address' },
        ],
      },
    ],
  },
] as const;
