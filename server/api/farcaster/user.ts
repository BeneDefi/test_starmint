import { Request, Response } from 'express';

// In-memory cache for Warpcast API responses
interface CacheEntry {
  data: any;
  timestamp: number;
}

const userDataCache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get Farcaster user data by FID from Warpcast API with caching
 */
export async function getUserByFid(req: Request, res: Response) {
  try {
    const fidParam = req.query.fid || req.headers.fid;
    
    if (!fidParam) {
      return res.status(400).json({ error: 'FID is required' });
    }
    
    // Parse and validate FID as integer
    const fid = parseInt(fidParam as string, 10);
    
    if (isNaN(fid) || fid <= 0) {
      return res.status(400).json({ error: 'FID must be a positive integer' });
    }
    
    // Check cache first
    const cached = userDataCache.get(fid);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`💾 Cache hit for FID ${fid}`);
      return res.json(cached.data);
    }
    
    console.log(`📸 Fetching user data from Warpcast for FID: ${fid}`);
    
    // Get user data from Warpcast API
    const response = await fetch(`https://api.warpcast.com/v2/user-by-fid?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user data from Warpcast: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.result?.user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = {
      fid: data.result.user.fid,
      username: data.result.user.username,
      displayName: data.result.user.displayName,
      pfp: {
        url: data.result.user.pfp?.url || '',
        verified: data.result.user.pfp?.verified || false,
      },
    };
    
    // Store in cache
    userDataCache.set(fid, {
      data: userData,
      timestamp: now
    });
    
    console.log(`✅ Retrieved and cached user data for ${userData.username}:`, userData.pfp.url);
    
    return res.json(userData);
  } catch (error) {
    console.error('Error fetching Warpcast user data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
