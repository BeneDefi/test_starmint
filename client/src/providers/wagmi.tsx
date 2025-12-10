import { WagmiProvider, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { customFarcasterConnector } from '../utils/farcasterConnector';

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org')
  },
  connectors: [customFarcasterConnector()]
});

const queryClient = new QueryClient();

export function WagmiProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
