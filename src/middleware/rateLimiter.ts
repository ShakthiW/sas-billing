import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Maximum number of requests per window
  message?: string;  // Custom error message
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = config;

  return async function rateLimiter(req: NextRequest): Promise<NextResponse | null> {
    // Get client identifier (IP address or user ID)
    const clientId = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    const now = Date.now();
    const windowStart = now - windowMs;

    // Initialize or get client's rate limit data
    if (!rateLimitStore[clientId] || rateLimitStore[clientId].resetTime < now) {
      rateLimitStore[clientId] = {
        count: 1,
        resetTime: now + windowMs
      };
      return null; // Allow request
    }

    // Increment request count
    rateLimitStore[clientId].count++;

    // Check if limit exceeded
    if (rateLimitStore[clientId].count > max) {
      return NextResponse.json(
        { 
          error: message,
          retryAfter: Math.ceil((rateLimitStore[clientId].resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitStore[clientId].resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitStore[clientId].resetTime).toISOString()
          }
        }
      );
    }

    return null; // Allow request
  };
}

// Pre-configured rate limiters for different use cases
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth attempts to 5 per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit uploads to 20 per hour
  message: 'Upload limit exceeded, please try again later.'
});