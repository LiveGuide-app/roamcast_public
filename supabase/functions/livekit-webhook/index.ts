import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { WebhookReceiver } from 'npm:livekit-server-sdk@1.2.7'

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

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
  // Debug logging for every request
  console.error('Webhook request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  })

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.error('Method not allowed:', req.method)
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get the raw body as text for webhook validation
    const rawBody = await req.text()
    console.error('Request body:', rawBody)
    
    const authorization = req.headers.get('Authorization')
    console.error('Authorization header:', authorization ? 'Present' : 'Missing')

    if (!authorization) {
      console.error('Missing authorization header')
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      // Validate the webhook using LiveKit's WebhookReceiver
      console.error('Attempting to validate webhook with LiveKit WebhookReceiver')
      const event = await webhookReceiver.receive(rawBody, authorization)
      console.error('Webhook event:', event)

      // Extract common fields
      const { room } = event
      const timestamp = new Date().toISOString()
      const tourId = extractTourId(room.name)

      if (!tourId) {
        console.error(`Invalid room name format: ${room.name}`)
        return new Response(JSON.stringify({ error: 'Invalid room name format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Handle different event types
      switch (event.event) {
        case 'room_started':
          console.error('Processing room_started event for tour:', tourId)
          await supabase
            .from('tours')
            .update({ room_started_at: timestamp })
            .eq('id', tourId)
          break

        case 'room_finished':
          console.error('Processing room_finished event for tour:', tourId)
          await supabase
            .from('tours')
            .update({ room_finished_at: timestamp })
            .eq('id', tourId)
          break

        case 'participant_joined':
          console.error('Processing participant_joined event:', event.participant?.identity)
          if (event.participant && isGuide(event.participant.identity)) {
            // Update guide join time in tours table
            await supabase
              .from('tours')
              .update({ livekit_guide_joined: timestamp })
              .eq('id', tourId)
          } else if (event.participant) {
            // Extract device ID and update participant join time
            const deviceId = extractDeviceId(event.participant.identity)
            if (deviceId) {
              await supabase
                .from('tour_participants')
                .update({ livekit_joined_room: timestamp })
                .eq('tour_id', tourId)
                .eq('device_id', deviceId)
            }
          }
          console.error(`Participant ${event.participant?.identity} joined tour ${tourId}`)
          break

        case 'participant_left':
          console.error('Processing participant_left event:', event.participant?.identity)
          if (event.participant && isGuide(event.participant.identity)) {
            // Update guide leave time in tours table
            await supabase
              .from('tours')
              .update({ livekit_guide_left: timestamp })
              .eq('id', tourId)
          } else if (event.participant) {
            // Extract device ID and update participant leave time
            const deviceId = extractDeviceId(event.participant.identity)
            if (deviceId) {
              await supabase
                .from('tour_participants')
                .update({ livekit_left_room: timestamp })
                .eq('tour_id', tourId)
                .eq('device_id', deviceId)
            }
          }
          console.error(`Participant ${event.participant?.identity} left tour ${tourId}`)
          break

        case 'track_published':
        case 'track_unpublished':
          console.error(`Track ${event.track?.name} ${event.event} in tour ${tourId}`)
          break
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('Error processing webhook:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Error processing webhook:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 