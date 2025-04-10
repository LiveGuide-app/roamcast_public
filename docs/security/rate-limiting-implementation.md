# Rate Limiting Implementation Plan

## Overview
This document outlines a simplified implementation plan for adding rate limiting to all API endpoints in the Roamcast application. While authentication endpoints are already protected by Supabase's built-in rate limiting, we need to implement rate limiting for our custom endpoints.

## Current API Endpoints

### 1. LiveKit Token Generation
- **Endpoint**: `/functions/v1/livekit-token`
- **Method**: POST
- **Purpose**: Generates LiveKit tokens for guides and listeners
- **Current Status**: No rate limiting

### 2. Stripe Onboarding
- **Endpoint**: `/functions/v1/stripe-onboarding`
- **Method**: POST
- **Purpose**: Handles Stripe Connect onboarding for tour guides
- **Current Status**: No rate limiting

### 3. Stripe Tip Payment
- **Endpoint**: `/functions/v1/stripe-tip-payment`
- **Method**: POST
- **Purpose**: Processes tip payments
- **Current Status**: No rate limiting

### 4. Stripe Dashboard Link
- **Endpoint**: `/functions/v1/stripe-dashboard-link`
- **Method**: POST
- **Purpose**: Generates Stripe dashboard links for guides
- **Current Status**: No rate limiting

## Implementation Plan

### Step 1: Create Rate Limiting Middleware

Create a new file `supabase/functions/_shared/rate-limiting.ts`:

```typescript
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
```

### Step 2: Update Client-Side Code

Add device ID to all API requests in the mobile app. Update the API client configuration:

```typescript
// lib/api.ts
import * as Application from 'expo-application';

// Get or create a stable device ID
const deviceId = await Application.getIosIdForVendorAsync() || 
                await Application.androidIdAsync() ||
                'unknown';

// Add device ID to all API requests
const headers = {
  'x-device-id': deviceId,
  // ... other headers
};
```

### Step 3: Implement Rate Limiting in Each Function

#### 3.1 LiveKit Token Function

Update `supabase/functions/livekit-token/index.ts`:

```typescript
import { rateLimit } from '../_shared/rate-limiting.ts';

// ... existing imports ...

serve(async (req) => {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      maxRequests: 60, // 60 requests per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ... rest of the existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
});
```

#### 3.2 Stripe Onboarding Function

Update `supabase/functions/stripe-onboarding/index.ts`:

```typescript
import { rateLimit } from '../_shared/rate-limiting.ts';

// ... existing imports ...

serve(async (req) => {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      maxRequests: 10, // 10 requests per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ... rest of the existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
});
```

#### 3.3 Stripe Tip Payment Function

Update `supabase/functions/stripe-tip-payment/index.ts`:

```typescript
import { rateLimit } from '../_shared/rate-limiting.ts';

// ... existing imports ...

serve(async (req) => {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      maxRequests: 30, // 30 requests per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ... rest of the existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
});
```

#### 3.4 Stripe Dashboard Link Function

Update `supabase/functions/stripe-dashboard-link/index.ts`:

```typescript
import { rateLimit } from '../_shared/rate-limiting.ts';

// ... existing imports ...

serve(async (req) => {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      maxRequests: 20, // 20 requests per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ... rest of the existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
});
```

## Rate Limit Configuration

| Endpoint | Requests per Minute | Window (ms) | Notes |
|----------|-------------------|-------------|-------|
| LiveKit Token | 60 | 60000 | Higher limit for real-time functionality |
| Stripe Onboarding | 10 | 60000 | Lower limit for sensitive operations |
| Stripe Tip Payment | 30 | 60000 | Moderate limit for payment processing |
| Stripe Dashboard Link | 20 | 60000 | Moderate limit for dashboard access |

## Implementation Steps

1. Create the rate limiting middleware
2. Update client-side code to include device ID
3. Update each function with rate limiting
4. Test the rate limiting implementation
5. Monitor and adjust limits as needed

## Testing Plan

1. Test rate limiting with multiple concurrent requests
2. Verify rate limit reset after window expiration
3. Test rate limit error responses
4. Test with different client identifiers (authenticated and unauthenticated)
5. Test with network changes (WiFi to cellular)
6. Test with app restarts

## Monitoring and Maintenance

1. Monitor rate limit hits and adjust limits if needed
2. Review rate limit logs for potential abuse
3. Consider implementing device-based blocking for repeated violations

## Security Considerations

1. Rate limits are per user ID (authenticated) or device ID (unauthenticated)
2. Failed rate limit checks return 429 status
3. Rate limits reset on function cold starts (acceptable trade-off for simplicity)
4. Uses stable device identification for mobile apps
5. Maintains separate limits for authenticated and unauthenticated requests

## Next Steps

1. Implement the rate limiting middleware
2. Update client-side code to include device ID
3. Update each function with rate limiting
4. Deploy changes to production
5. Monitor and adjust as needed 