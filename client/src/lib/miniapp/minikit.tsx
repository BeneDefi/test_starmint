import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface UserProfile {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface MiniKitContextType {
  isReady: boolean;
  user: UserProfile | null;
  context: any;
  isConnected: boolean;
  signIn: () => Promise<void>;
  shareScore: (score: number) => Promise<void>;
  addToApp: () => Promise<void>;
  notifyReady: () => void;
}

const MiniKitContext = createContext<MiniKitContextType | undefined>(undefined);

interface MiniKitProviderProps {
  children: ReactNode;
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [context, setContext] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Helper function to authenticate user with server and store token
  const authenticateUserWithServer = async (userData: UserProfile) => {
    try {
      console.log('🔐 Authenticating user with server:', userData.fid);
      const authResponse = await fetch('/api/farcaster/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: userData.fid,
          username: userData.username,
          displayName: userData.displayName,
          pfpUrl: userData.pfpUrl
        }),
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.token) {
          localStorage.setItem('authToken', authData.token);
          console.log('✅ User authenticated with server successfully');
          return authData.token;
        }
      } else {
        console.error('❌ Server authentication failed:', await authResponse.text());
      }
    } catch (authError) {
      console.error('❌ Error during server authentication:', authError);
    }
    return null;
  };

  // useEffect(() => {
  //   const initMiniKit = () => {
  //     console.log('🚀 Starting MiniKit initialization...');

  //     // Get context in background
  //     const getContextAsync = async () => {
  //       try {
  //         console.log('🔗 Getting context information...');
  //         const contextData = await sdk.context;
  //         console.log('📊 Context data received:', contextData);
  //         setContext(contextData);

  //         // Check if user is already signed in
  //         if (contextData?.user) {
  //           console.log('👤 User found in context:', contextData.user);
  //           setUser({
  //             fid: contextData.user.fid,
  //             username: contextData.user.username,
  //             displayName: contextData.user.displayName,
  //             pfpUrl: contextData.user.pfpUrl
  //           });
  //           setIsConnected(true);
  //         }
  //       } catch (contextError) {
  //         console.log('📱 No Farcaster context (running standalone)');
  //       }
  //     };

  //     // Start context retrieval in background
  //     getContextAsync();

  //     // Mark as ready immediately (don't call sdk.actions.ready() here yet)
  //     setIsReady(true);
  //     console.log('🎉 MiniKit initialization completed');
  //   };

  //   // Initialize immediately
  //   initMiniKit();
  // }, []);

  useEffect(() => {
    const initMiniKit = () => {
      console.log("🚀 Starting MiniKit initialization...");

      // Get context in background (don't block on this)
      const getContextAsync = async () => {
        try {
          console.log("🔗 Getting context information...");

          // Add timeout to prevent hanging
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout after 2000ms')), 2000)
          );

          const contextData = await Promise.race([contextPromise, timeoutPromise]) as any;
          console.log("📊 Context data received:", contextData);
          console.log("🔍 Deep context analysis:", {
            hasContext: !!contextData,
            hasUser: !!contextData?.user,
            userFid: contextData?.user?.fid,
            userPfp: contextData?.user?.pfpUrl,
            userDisplay: contextData?.user?.displayName,
            userUsername: contextData?.user?.username,
            contextType: typeof contextData,
            contextKeys: contextData ? Object.keys(contextData) : 'no context'
          });
          setContext(contextData);

          // Check if user is already signed in
          console.log("🔍 Checking context for user:", {
            hasContextData: !!contextData,
            hasUser: !!contextData?.user,
            hasFid: !!contextData?.user?.fid,
            userValue: contextData?.user
          });

          if (contextData?.user && contextData.user.fid) {
            console.log("👤 User found in context:", {
              fid: contextData.user.fid,
              username: contextData.user.username,
              displayName: contextData.user.displayName,
              pfpUrl: contextData.user.pfpUrl
            });

            const userData = {
              fid: contextData.user.fid,
              username: contextData.user.username,
              displayName: contextData.user.displayName,
              pfpUrl: contextData.user.pfpUrl
            };

            console.log("🖼️ Profile picture URL:", userData.pfpUrl);

            // Validate and potentially fix profile picture URL
            if (userData.pfpUrl) {
              console.log("✅ Valid profile picture URL found, testing load...");
              const img = new Image();
              img.onload = () => console.log("✅ Profile picture loads successfully");
              img.onerror = () => console.log("❌ Profile picture failed to load:", userData.pfpUrl);
              img.src = userData.pfpUrl;
            } else {
              console.log("⚠️ No profile picture URL in Farcaster context");
            }

            setUser(userData);
            setIsConnected(true);

            // Update global context for game authentication
            (window as any).__miniKitContext__ = { user: userData, context: contextData };
            console.log("🌐 Global MiniKit context set on window:", (window as any).__miniKitContext__);

            // Immediately populate playerStats store to ensure profile page has data
            try {
              const { usePlayerStats } = await import('../stores/usePlayerStats');
              const playerStatsState = usePlayerStats.getState();
              console.log('🔄 Setting user data in playerStats store for immediate access...');
              playerStatsState.setUserData(userData.fid, userData.displayName || userData.username, userData.pfpUrl || '');
              console.log('✅ User data set in store, profile page should now work');
            } catch (error) {
              console.error('❌ Failed to set user data in store:', error);
            }

            // Authenticate with server immediately
            console.log("🔄 Starting server authentication for Farcaster user...");
            const authToken = await authenticateUserWithServer(userData);
            if (authToken) {
              console.log("✅ MiniKit initialization: Server authentication completed successfully");

              // ✅ Force a fresh profile sync after successful authentication
              try {
                const { usePlayerStats } = await import('../stores/usePlayerStats');
                const playerStatsState = usePlayerStats.getState();
                console.log('🔁 Fetching live player stats from server after auth...');
                await playerStatsState.loadPlayerStats(userData.fid);
                console.log('✅ Player stats synchronized with server');
              } catch (syncError) {
                console.error('❌ Failed to sync live player stats after auth:', syncError);
              }

              // Immediately populate playerStats store to ensure game saves work
              const { usePlayerStats } = await import('../stores/usePlayerStats');
              const playerStatsState = usePlayerStats.getState();
              console.log('📊 Populating playerStats store with Farcaster user data...');
              playerStatsState.setUserData(userData.fid, userData.displayName || userData.username, userData.pfpUrl || '');
              playerStatsState.loadPlayerStats(userData.fid);
              console.log('✅ PlayerStats store populated for game persistence');
            } else {
              console.error("❌ MiniKit initialization: Server authentication failed");
            }
          } else {
            console.log("👤 No user found in Farcaster context - setting up test user");
            // Set test user when no Farcaster user is available (standalone mode)
            const testUser = {
              fid: 12345,
              username: "testgamer",
              displayName: "Test Gamer",
              pfpUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face&facepad=2&fm=jpg&q=80"
            };

            console.log("🧪 Setting up test user for demo:", testUser);
            console.log("🖼️ Test profile picture URL:", testUser.pfpUrl);
            setUser(testUser);
            setIsConnected(true);

            // Update global context for game authentication
            (window as any).__miniKitContext__ = { user: testUser, context: null };
            console.log("🌐 Global MiniKit context set for test user:", (window as any).__miniKitContext__);

            // Immediately populate playerStats store to ensure profile page has data
            try {
              const { usePlayerStats } = await import('../stores/usePlayerStats');
              const playerStatsState = usePlayerStats.getState();
              console.log('🔄 Setting test user data in playerStats store for immediate access...');
              playerStatsState.setUserData(testUser.fid, testUser.displayName || testUser.username, testUser.pfpUrl || '');

              // Also trigger loading of player stats immediately
              console.log('🔄 Loading player stats for test user...');
              await playerStatsState.loadPlayerStats(testUser.fid);
              console.log('✅ Test user data and stats loaded in store, profile page should now work');
            } catch (error) {
              console.error('❌ Failed to set test user data in store:', error);
            }

            // Authenticate test user with server immediately
            console.log("🔄 Starting server authentication for test user...");
            const authToken = await authenticateUserWithServer(testUser);
            if (authToken) {
              console.log("✅ Test user authentication completed successfully");

              // Immediately populate playerStats store to ensure game saves work
              const { usePlayerStats } = await import('../stores/usePlayerStats');
              const playerStatsState = usePlayerStats.getState();
              console.log('📊 Populating playerStats store with test user data...');
              playerStatsState.setUserData(testUser.fid, testUser.displayName || testUser.username, testUser.pfpUrl || '');
              playerStatsState.loadPlayerStats(testUser.fid);
              console.log('✅ PlayerStats store populated for game persistence');
            } else {
              console.error("❌ Test user authentication failed");
            }
          }
        } catch (contextError) {
          console.log("📱 SDK context failed (running in standalone):", contextError);
          console.log("🧪 Setting up fallback test user for demo purposes");

          const fallbackTestUser = {
            fid: 54321,
            username: "standalonegamer",
            displayName: "Standalone Gamer",
            pfpUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face&facepad=2&fm=jpg&q=80"
          };

          console.log("👤 Fallback test user created:", fallbackTestUser);
          setUser(fallbackTestUser);
          setIsConnected(true);

          // Update global context for game authentication
          (window as any).__miniKitContext__ = { user: fallbackTestUser, context: null };
          console.log("🌐 Global MiniKit context set for fallback user:", (window as any).__miniKitContext__);

          // Immediately populate playerStats store to ensure profile page has data
          try {
            const { usePlayerStats } = await import('../stores/usePlayerStats');
            const playerStatsState = usePlayerStats.getState();
            console.log('🔄 Setting fallback user data in playerStats store for immediate access...');
            playerStatsState.setUserData(fallbackTestUser.fid, fallbackTestUser.displayName || fallbackTestUser.username, fallbackTestUser.pfpUrl || '');
            console.log('✅ Fallback user data set in store, profile page should now work');
          } catch (error) {
            console.error('❌ Failed to set fallback user data in store:', error);
          }

          // Authenticate fallback test user with server immediately
          console.log("🔄 Starting server authentication for fallback user...");
          const authToken = await authenticateUserWithServer(fallbackTestUser);
          if (authToken) {
            console.log("✅ Fallback user authentication completed successfully");

            // Immediately populate playerStats store to ensure game saves work
            const { usePlayerStats } = await import('../stores/usePlayerStats');
            const playerStatsState = usePlayerStats.getState();
            console.log('📊 Populating playerStats store with fallback user data...');
            playerStatsState.setUserData(fallbackTestUser.fid, fallbackTestUser.displayName || fallbackTestUser.username, fallbackTestUser.pfpUrl || '');
            playerStatsState.loadPlayerStats(fallbackTestUser.fid);
            console.log('✅ PlayerStats store populated for game persistence');
          } else {
            console.error("❌ Fallback user authentication failed");
          }
        }
      };

      // Start context retrieval in background
      getContextAsync();

      // Mark as ready immediately (don't wait for context)
      setIsReady(true);
      console.log("🎉 MiniKit initialization completed");

      // Global context will be set by the async function above
    };

    // Initialize immediately
    initMiniKit();
  }, []);

  const signIn = async () => {
    try {
      // Generate a simple nonce for sign in
      const nonce = Math.random().toString(36).substring(7);
      const result = await sdk.actions.signIn({ nonce });
      if (result && typeof result === 'object' && 'user' in result) {
        const user = result.user as any;
        setUser({
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfpUrl
        });
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const shareScore = async (score: number) => {
    try {
      await sdk.actions.composeCast({
        text: `🚀 Just scored ${score.toLocaleString()} points in STARMINT! Think you can beat my high score? 👾`,
        embeds: ['https://farcaster.xyz/miniapps/DEE7X1AmwTMp/space-shooter-game']
      });
    } catch (error) {
      console.error('Failed to share score:', error);
    }
  };

  const addToApp = async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch (error) {
      console.error('Failed to add to app:', error);
    }
  };

  const notifyReady = async () => {
    try {
      console.log("✅ Calling sdk.actions.ready() after app content is loaded...");
      if (sdk?.actions?.ready) {
        await sdk.actions.ready();
        console.log("🎯 sdk.actions.ready() resolved successfully");
      } else {
        console.warn("⚠️ sdk.actions.ready is not available");
      }
    } catch (readyError) {
      console.error("⚠️ sdk.actions.ready() failed:", readyError);
    }
  };

  const value: MiniKitContextType = {
    isReady,
    user,
    context,
    isConnected,
    signIn,
    shareScore,
    addToApp,
    notifyReady
  };

  return (
    <MiniKitContext.Provider value={value}>
      {children}
    </MiniKitContext.Provider>
  );
}

export function useMiniKit() {
  const context = useContext(MiniKitContext);
  if (context === undefined) {
    throw new Error('useMiniKit must be used within a MiniKitProvider');
  }
  return context;
}