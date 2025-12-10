import React, { createContext, useContext } from 'react';
import { useFarcasterAuth } from '../hooks/useFarcasterAuth';

interface FarcasterAuthContextType {
  isAuthenticated: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => void;
  address?: `0x${string}`;
  isConnected: boolean;
  user?: any;
}

const FarcasterAuthContext = createContext<FarcasterAuthContextType | undefined>(undefined);

export function FarcasterAuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, signIn, signOut, address, isConnected, user } = useFarcasterAuth();

  return (
    <FarcasterAuthContext.Provider value={{ isAuthenticated, signIn, signOut, address, isConnected, user }}>
      {children}
    </FarcasterAuthContext.Provider>
  );
}

export function useFarcasterContext() {
  const context = useContext(FarcasterAuthContext);
  if (context === undefined) {
    throw new Error('useFarcasterContext must be used within a FarcasterAuthProvider');
  }
  return context;
}
