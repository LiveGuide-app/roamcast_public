import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { WebhookReceiver } from 'https://esm.sh/livekit-server-sdk@1.2.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY')
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('Missing LiveKit credentials')
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials')
}

const receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Helper function to extract tour ID from room name
function extractTourId(roomName: string): string | null {
  // Room name format is 'tour-${tourId}'
  const match = roomName.match(/^tour-(.+)$/)
  return match ? match[1] : null
}

// Helper function to extract device ID from participant identity
function extractDeviceId(identity: string): string | null {
  // Identity format is 'listener-${deviceId}'
  const match = identity.match(/^listener-(.+)$/)
  return match ? match[1] : null
}

// Helper function to check if participant is a guide
function isGuide(identity: string): boolean {
  return identity.startsWith('guide-')
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

    // Get the raw body as text for webhook validation
    const rawBody = await req.text()
    const authorization = req.headers.get('Authorization')

    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate and parse the webhook
    const event = await receiver.receive(rawBody, authorization)

    // Extract common fields
    const { room, participant } = event
    const timestamp = new Date().toISOString()
    const tourId = extractTourId(room.name)

    if (!tourId) {
      console.warn(`Invalid room name format: ${room.name}`)
      return new Response(JSON.stringify({ error: 'Invalid room name format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle different event types
    switch (event.event) {
      case 'room_started':
        await supabase
          .from('tours')
          .update({ room_started_at: timestamp })
          .eq('id', tourId)
        break

      case 'room_finished':
        await supabase
          .from('tours')
          .update({ room_finished_at: timestamp })
          .eq('id', tourId)
        break

      case 'participant_joined':
        if (isGuide(participant.identity)) {
          // Update guide join time in tours table
          await supabase
            .from('tours')
            .update({ livekit_guide_joined: timestamp })
            .eq('id', tourId)
        } else {
          // Extract device ID and update participant join time
          const deviceId = extractDeviceId(participant.identity)
          if (deviceId) {
            await supabase
              .from('tour_participants')
              .update({ livekit_joined_room: timestamp })
              .eq('tour_id', tourId)
              .eq('device_id', deviceId)
          }
        }
        console.log(`Participant ${participant.identity} joined tour ${tourId}`)
        break

      case 'participant_left':
        if (isGuide(participant.identity)) {
          // Update guide leave time in tours table
          await supabase
            .from('tours')
            .update({ livekit_guide_left: timestamp })
            .eq('id', tourId)
        } else {
          // Extract device ID and update participant leave time
          const deviceId = extractDeviceId(participant.identity)
          if (deviceId) {
            await supabase
              .from('tour_participants')
              .update({ livekit_left_room: timestamp })
              .eq('tour_id', tourId)
              .eq('device_id', deviceId)
          }
        }
        console.log(`Participant ${participant.identity} left tour ${tourId}`)
        break

      case 'track_published':
      case 'track_unpublished':
        console.log(`Track ${event.track.name} ${event.event} in tour ${tourId}`)
        break
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 