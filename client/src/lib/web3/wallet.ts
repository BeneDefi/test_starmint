import { sdk } from '@farcaster/miniapp-sdk';
import { parseEther, type Address } from 'viem';

export class WalletManager {
  private static instance: WalletManager;

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  async getProvider() {
    try {
      return await sdk.wallet.ethProvider;
    } catch (error) {
      console.error('Failed to get Ethereum provider:', error);
      return null;
    }
  }

  async getAccount(): Promise<Address | null> {
    try {
      const provider = await this.getProvider();
      if (!provider) return null;
      
      const accounts = await provider.request({ method: 'eth_accounts' }) as Address[];
      return accounts[0] || null;
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  async switchToBase(): Promise<boolean> {
    try {
      const provider = await this.getProvider();
      if (!provider) return false;

      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base Chain ID in hex
      });
      return true;
    } catch (error) {
      console.error('Failed to switch to Base chain:', error);
      return false;
    }
  }

  async sendTransaction(to: Address, value: string, data?: string): Promise<string | null> {
    try {
      const provider = await this.getProvider();
      const account = await this.getAccount();
      
      if (!provider || !account) return null;

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to,
          value: `0x${parseEther(value).toString(16)}`,
          data: (data || '0x') as `0x${string}`,
        }],
      }) as string;

      return txHash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      return null;
    }
  }

  async getBalance(): Promise<string | null> {
    try {
      const provider = await this.getProvider();
      const account = await this.getAccount();
      
      if (!provider || !account) return null;

      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [account, 'latest'],
      }) as string;

      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }
}