import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { tipPaymentSchema } from '../_shared/schemas.ts'
import { validateRequest } from '../_shared/validation.ts'
import { sanitizeObject } from '../_shared/sanitization.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Log Stripe client initialization (without exposing the secret key)
console.log('Stripe client initialized with:', {
  apiVersion: '2023-10-16',
  hasSecretKey: !!Deno.env.get('STRIPE_SECRET_KEY'),
  secretKeyLength: Deno.env.get('STRIPE_SECRET_KEY')?.length,
  secretKeyPrefix: Deno.env.get('STRIPE_SECRET_KEY')?.substring(0, 8)
})

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse and sanitize request body
    const body = await req.json()
    console.log('Request body:', body)
    const sanitizedBody = sanitizeObject(body)
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, tipPaymentSchema)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Use the validated and sanitized data
    const { tourParticipantId, amount, currency, deviceId } = validationResult.data

    // Get the tour participant and related tour info
    const { data: participant, error: participantError } = await supabase
      .from('tour_participants')
      .select(`
        *,
        tours (
          guide_id,
          users (
            stripe_account_id,
            stripe_account_enabled
          )
        )
      `)
      .eq('id', tourParticipantId)
      .eq('device_id', deviceId)
      .single()
      
    if (participantError || !participant) {
      console.error('Tour participant error:', participantError)
      return new Response(
        JSON.stringify({ error: 'Tour participant not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const guide = participant.tours?.users
    if (!guide?.stripe_account_id || !guide.stripe_account_enabled) {
      return new Response(
        JSON.stringify({ error: 'Guide not found or not connected to Stripe' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create a payment intent without confirming
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: Math.round(amount * 0.075), // 7.5% platform fee
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tourParticipantId,
        deviceId,
      }
    }, {
      stripeAccount: guide.stripe_account_id,
    })
    
    // Record the tip in the database
    const { error: tipError } = await supabase
      .from('tour_tips')
      .insert({
        tour_participant_id: tourParticipantId,
        amount,
        currency,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        stripe_account_id: guide.stripe_account_id,
        application_fee_amount: Math.round(amount * 0.05)
      })
      
    if (tipError) {
      console.error('Error recording tip:', tipError)
      return new Response(
        JSON.stringify({ error: 'Error recording tip' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Created payment intent:', {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    })
    
    return new Response(
      JSON.stringify({ 
        paymentIntent: paymentIntent.client_secret
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing payment:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your payment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 