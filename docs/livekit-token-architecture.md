# LiveKit Token Generation Architecture

## Overview
This document outlines the simplified architecture for LiveKit token generation in the Roamcast application. The system handles two main scenarios:
1. Guide token generation (when starting a tour)
2. Guest token generation (when joining a tour)

Note: LiveKit automatically manages room lifecycle:
- Rooms are created automatically when the first participant joins
- Rooms are closed automatically when the last participant leaves

## Edge Functions

### 1. Generate Guide Token
**Endpoint:** `POST /api/livekit/guide-token`
**Purpose:** Generates a token for a guide starting a tour
**Input:**
```typescript
{
  tourId: string;
  guideName: string;
}
```
**Flow:**
1. Validate guide authentication
2. Generate token with:
   - Room ID: `tour-{tourId}`
   - Identity: Guide's user ID
   - Permissions:
     ```typescript
     {
       roomJoin: true,
       canPublish: true,
       canSubscribe: true,
       canPublishData: true,
       canPublishSources: ['microphone']
     }
     ```
   - Metadata:
     ```typescript
     {
       name: guideName,
       role: 'guide',
       tourId: tourId
     }
     ```

### 2. Generate Guest Token
**Endpoint:** `POST /api/livekit/guest-token`
**Purpose:** Generates a token for a guest joining a tour
**Input:**
```typescript
{
  tourId: string;
  deviceId: string;
}
```
**Flow:**
1. Validate tour exists and is active
2. Generate token with:
   - Room ID: `tour-{tourId}`
   - Identity: Device ID
   - Permissions:
     ```typescript
     {
       roomJoin: true,
       canPublish: false,
       canSubscribe: true,
       canPublishData: false
     }
     ```
   - Metadata:
     ```typescript
     {
       role: 'listener',
       tourId: tourId,
       deviceId: deviceId
     }
     ```

## Implementation

### 1. Environment Setup
```typescript
// Required environment variables in Supabase
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_WS_URL=your_websocket_url
```

### 2. Edge Function Implementation
```typescript
// supabase/functions/livekit-token/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { AccessToken, VideoGrant } from 'livekit-server-sdk'

const apiKey = Deno.env.get('LIVEKIT_API_KEY')
const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')

serve(async (req) => {
  try {
    const { tourId, role, metadata } = await req.json()
    
    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: role === 'guide' ? `guide-${tourId}` : `listener-${tourId}`,
      name: metadata.name,
      metadata: JSON.stringify(metadata)
    })

    // Add video grant
    const grant = new VideoGrant({
      room: `tour-${tourId}`,
      roomJoin: true,
      canPublish: role === 'guide',
      canSubscribe: true,
      canPublishData: role === 'guide',
      canPublishSources: role === 'guide' ? ['microphone'] : undefined
    })

    at.addGrant(grant)
    const token = at.toJwt()

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### 3. Client Usage
```typescript
// Example client code
async function getGuideToken(tourId: string, guideName: string) {
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      tourId,
      role: 'guide',
      metadata: { name: guideName }
    }
  })
  
  if (error) throw error
  return data.token
}

async function getGuestToken(tourId: string, deviceId: string) {
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      tourId,
      role: 'listener',
      metadata: { deviceId }
    }
  })
  
  if (error) throw error
  return data.token
}
```

## Security Considerations

### 1. Token Security
- Tokens are JWT-based and signed with API secret
- 3-hour expiration for initial tokens
- 10-minute expiration for refresh tokens
- Role-based permissions enforced

### 2. Access Control
- Guide tokens only generated for authenticated guides
- Guest tokens only generated for valid tour codes
- Room access restricted to valid tokens

### 3. Rate Limiting
- Implement rate limiting on token generation endpoints
- Monitor token generation patterns

## Error Handling

### Common Errors
- Invalid tour code
- Expired tokens
- Rate limit exceeded
- Authentication failures

### Recovery Procedures
- Automatic token refresh
- Graceful degradation
- User-friendly error messages

## References
- [LiveKit Token Generation](https://docs.livekit.io/home/server/generating-tokens/)
- [LiveKit Server SDK](https://docs.livekit.io/server-sdk/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) 