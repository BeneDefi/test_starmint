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

export const SCORE_NFT_CONTRACT_ADDRESS = (import.meta.env.VITE_SCORE_NFT_CONTRACT_ADDRESS || 
  '0xE6729F7BCefc2d45da01C0b9FB10Ac2f644FBF1e') as `0x${string}`;

export const SCORE_NFT_ABI = [
  {
    name: 'mintScoreWithSignature',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'score', type: 'uint256' },
      { name: 'level', type: 'uint256' },
      { name: 'enemiesDefeated', type: 'uint256' },
      { name: 'gameTime', type: 'uint256' },
      { name: 'accuracy', type: 'uint256' },
      { name: 'sessionHash', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    name: 'mintScoreAuthorized',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'score', type: 'uint256' },
      { name: 'level', type: 'uint256' },
      { name: 'enemiesDefeated', type: 'uint256' },
      { name: 'gameTime', type: 'uint256' },
      { name: 'accuracy', type: 'uint256' },
      { name: 'sessionHash', type: 'bytes32' },
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
          { name: 'enemiesDefeated', type: 'uint256' },
          { name: 'gameTime', type: 'uint256' },
          { name: 'accuracy', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'player', type: 'address' },
          { name: 'sessionHash', type: 'bytes32' },
        ],
      },
    ],
  },
  {
    name: 'getPlayerTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'authorizedMinter',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
