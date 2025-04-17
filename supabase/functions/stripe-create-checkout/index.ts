import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.17.0/deno/stripe.mjs'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  getFeeStructure, 
  calculateFees, 
  validateTipAmount, 
  validateCurrency 
} from '../_shared/fee-calculation.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get request body
    const { tourParticipantId, amount, currency } = await req.json()

    // Validate inputs
    if (!tourParticipantId || !amount || !currency) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!validateTipAmount(amount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tip amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!validateCurrency(currency)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Get fee structure and calculate fees
    const feeStructure = await getFeeStructure(supabase, currency)
    if (!feeStructure) {
      return new Response(
        JSON.stringify({ error: 'Fee structure not found for currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fees = calculateFees(amount, feeStructure)

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ui_mode: 'embedded',
      payment_intent_data: {
        application_fee_amount: fees.platformFee, // Only take platform fee
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
            unit_amount: fees.totalAmount, // Use total amount including all fees
          },
          quantity: 1,
        },
      ],
      metadata: {
        tourParticipantId,
        tipAmount: fees.tipAmount,
        processingFee: fees.processingFee,
        platformFee: fees.platformFee
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
        amount: fees.tipAmount,
        currency: currency.toLowerCase(),
        payment_intent_id: session.payment_intent,
        checkout_session_id: session.id,
        status: 'pending',
        stripe_account_id: guide.stripe_account_id,
        processing_fee_amount: fees.processingFee,
        platform_fee_amount: fees.platformFee
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
        clientSecret: session.client_secret,
        fees
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