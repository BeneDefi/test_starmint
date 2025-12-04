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

// ========== LEGACY: ScoreNFT (Simple) ==========
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

// ========== NEW: HighScoreNFT (Advanced with verification, fees, rarity) ==========
// Will be set via environment variable after deployment
// Contract includes: backend signature verification, mint fees, rarity tiers, rich metadata

export const HIGH_SCORE_NFT_ABI = [
  {
    name: 'mintHighScore',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'score', type: 'uint256' },
      { name: 'level', type: 'uint256' },
      { name: 'enemiesDefeated', type: 'uint256' },
      { name: 'gameTime', type: 'uint256' },
      { name: 'screenshotHash', type: 'bytes32' },
      { name: 'externalUrl', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getMintFeeInETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getRarity',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'score', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'getPlayerTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'scoreData',
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
          { name: 'enemiesDefeated', type: 'uint256' },
          { name: 'gameTime', type: 'uint256' },
          { name: 'mintedAt', type: 'uint256' },
          { name: 'player', type: 'address' },
          { name: 'screenshotHash', type: 'bytes32' },
          { name: 'externalUrl', type: 'string' },
        ],
      },
    ],
  },
] as const;
