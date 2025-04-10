// Simple in-memory store for rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

export function rateLimit(
  req: Request,
  config: RateLimitConfig = defaultConfig
): { success: boolean; error?: string } {
  // Get user ID from auth header for authenticated requests
  const authHeader = req.headers.get('Authorization');
  const deviceId = req.headers.get('x-device-id');
  
  // For authenticated requests, use user ID
  // For unauthenticated requests, use device ID
  // This ensures stable identification across network changes
  const clientId = authHeader ? 
    authHeader.replace('Bearer ', '') : 
    deviceId || 'unknown';

  const now = Date.now();
  const key = `rate_limit:${clientId}`;
  
  // Get or create rate limit entry
  let rateData = rateLimits.get(key);
  
  // Reset if window has expired
  if (!rateData || now > rateData.resetTime) {
    rateData = {
      count: 0,
      resetTime: now + config.windowMs
    };
    rateLimits.set(key, rateData);
  }

  // Check if rate limit exceeded
  if (rateData.count >= config.maxRequests) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
    };
  }

  // Increment count
  rateData.count++;
  return { success: true };
} 