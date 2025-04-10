import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"
import { liveKitTokenSchema } from '../_shared/schemas.ts'
import { validateRequest } from '../_shared/validation.ts'
import { sanitizeObject } from '../_shared/sanitization.ts'

const apiKey = Deno.env.get('LIVEKIT_API_KEY')
const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')

if (!apiKey || !apiSecret) {
  throw new Error('Missing LiveKit credentials')
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse and sanitize request body
    const body = await req.json();
    console.log('Received token request:', body);
    const sanitizedBody = sanitizeObject(body);
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, liveKitTokenSchema);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { tourId, role, metadata, deviceId } = validationResult.data;

    const isGuide = role === 'guide'
    // Use deviceId for listeners, guide-{tourId} for guides
    const identity = isGuide ? `guide-${tourId}` : `listener-${deviceId}`
    const name = metadata?.name || role

    console.log('Generating token for:', { identity, name, role, isGuide });

    // Create JWT payload
    const payload = {
      video: {
        room: `tour-${tourId}`,
        roomJoin: true,
        canPublish: isGuide,
        canSubscribe: true,
        canPublishData: isGuide,
        canPublishSources: isGuide ? ['microphone'] : undefined
      },
      metadata: JSON.stringify({
        role,
        tourId,
        ...metadata
      }),
      name,
      sub: identity,
      iss: apiKey,
      nbf: getNumericDate(0),
      exp: getNumericDate(21600), // 6 hours (21600 seconds)
      iat: getNumericDate(0)
    }

    console.log('Token payload:', payload);

    // Sign the JWT
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, key)

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error generating token:', error)
    return new Response(JSON.stringify({ error: 'An error occurred generating your token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 