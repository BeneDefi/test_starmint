import { useCallback } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useMiniKit } from '../lib/miniapp/minikit';

interface SuiteContext {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    verified_accounts?: Array<{ wallet_address: string }>;
  };
  getSigner?: () => Promise<any>;
  isTestnet?: boolean;
}

export function useFarcasterAuth() {
  const { context, user } = useMiniKit() as { context: SuiteContext; user: any };
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const connectWallet = useCallback(async () => {
    try {
      const connector = connectors[0];
      if (connector) {
        await connect({ connector });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Wallet connection error:', error);
      return false;
    }
  }, [connect, connectors]);

  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    isAuthenticated: !!user,
    signIn: connectWallet,
    signOut: disconnectWallet,
    address,
    isConnected,
    user,
    context,
  };
}
