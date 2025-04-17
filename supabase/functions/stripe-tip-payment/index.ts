import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
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

// Log Stripe client initialization (without exposing the secret key)
console.log('Stripe client initialized with:', {
  apiVersion: '2023-10-16',
  hasSecretKey: !!Deno.env.get('STRIPE_SECRET_KEY'),
  secretKeyLength: Deno.env.get('STRIPE_SECRET_KEY')?.length,
  secretKeyPrefix: Deno.env.get('STRIPE_SECRET_KEY')?.substring(0, 8)
})

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get request body
    const { tourParticipantId, amount, currency, deviceId } = await req.json()

    // Validate inputs
    if (!tourParticipantId || !amount || !currency || !deviceId) {
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

    // Get tour participant and guide info
    const { data: participant, error: participantError } = await supabase
      .from('tour_participants')
      .select(`
        *,
        tours (
          users!tours_guide_id_fkey (
            stripe_account_id,
            stripe_account_enabled,
            stripe_default_currency
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

    // Create payment intent with the total amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: fees.totalAmount,
      currency: currency.toLowerCase(),
      application_fee_amount: fees.platformFee, // Only take platform fee
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tourParticipantId,
        deviceId,
        tipAmount: fees.tipAmount,
        processingFee: fees.processingFee,
        platformFee: fees.platformFee
      }
    }, {
      stripeAccount: guide.stripe_account_id,
    })
    
    // Record the tip in the database
    const { error: tipError } = await supabase
      .from('tour_tips')
      .insert({
        tour_participant_id: tourParticipantId,
        amount: fees.tipAmount,
        currency: currency.toLowerCase(),
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
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
        paymentIntent: paymentIntent.client_secret,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
        fees
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create payment intent' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 