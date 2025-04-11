import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.17.0/deno/stripe.mjs'
import { tipPaymentSchema } from '../_shared/schemas.ts'
import { validateRequest } from '../_shared/validation.ts'
import { sanitizeObject } from '../_shared/sanitization.ts'
import { rateLimit } from '../_shared/rate-limiting.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse and validate request body
    const body = await req.json()
    const sanitizedBody = sanitizeObject(body)
    const validationResult = validateRequest(sanitizedBody, tipPaymentSchema)
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { tourParticipantId, amount, currency } = validationResult.data

    // Get the tour participant and related tour info
    const { data: participant, error: participantError } = await supabase
      .from('tour_participants')
      .select(`
        *,
        tours (
          guide_id,
          users (
            id,
            stripe_account_id,
            stripe_account_enabled,
            full_name
          )
        )
      `)
      .eq('id', tourParticipantId)
      .single()
      
    if (participantError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Tour participant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const guide = participant.tours?.users
    if (!guide?.stripe_account_id || !guide.stripe_account_enabled) {
      return new Response(
        JSON.stringify({ error: 'Guide not found or not connected to Stripe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ui_mode: 'embedded',
      payment_intent_data: {
        application_fee_amount: Math.round(amount * 0.075), // 7.5% platform fee
        setup_future_usage: 'on_session',
      },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Tip for ${guide.full_name}`,
              description: 'Thank you for the great tour!',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        tourParticipantId,
      },
      return_url: `${req.headers.get('origin')}/tour/thank-you?session_id={CHECKOUT_SESSION_ID}&tourId=${participant.tour_id}&guideId=${guide.id}`,
      customer_creation: 'if_required',
      billing_address_collection: 'auto',
      payment_method_options: {
        card: {
          setup_future_usage: 'on_session',
          request_three_d_secure: 'automatic',
        },
      },
    }, {
      stripeAccount: guide.stripe_account_id,
    });

    // Record the checkout session in the database
    const { error: tipError } = await supabase
      .from('tour_tips')
      .insert({
        tour_participant_id: tourParticipantId,
        amount,
        currency,
        payment_intent_id: session.payment_intent,
        status: 'pending',
        stripe_account_id: guide.stripe_account_id,
        application_fee_amount: Math.round(amount * 0.075)
      })

    if (tipError) {
      console.error('Error recording tip:', tipError)
      return new Response(
        JSON.stringify({ error: 'Error recording tip' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        clientSecret: session.client_secret
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred creating the checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 