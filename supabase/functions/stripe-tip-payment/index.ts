import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get request body
    const { tourParticipantId, amount, currency, deviceId } = await req.json()

    // Verify tour participant exists and belongs to the device
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
      console.error('Tour participant error:', participantError);
      return new Response(
        JSON.stringify({ error: 'Tour participant not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if a successful tip already exists
    const { data: existingTip } = await supabase
      .from('tour_tips')
      .select('id')
      .eq('tour_participant_id', tourParticipantId)
      .eq('status', 'succeeded')
      .single()

    if (existingTip) {
      return new Response(
        JSON.stringify({ error: 'Tip already paid' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!participant.tours.users.stripe_account_enabled) {
      return new Response(
        JSON.stringify({ error: 'Guide has not enabled payments' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get guide's default currency or use provided currency
    const guideCurrency = participant.tours.users.stripe_default_currency || currency

    // Calculate application fee (5% of tip amount)
    const applicationFeeAmount = Math.round(amount * 0.05)

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: guideCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: applicationFeeAmount,
      metadata: {
        tourParticipantId,
        tourId: participant.tour_id,
        guideId: participant.tours.users.id,
        originalCurrency: currency,
        guideCurrency,
        deviceId,
      },
    }, {
      stripeAccount: participant.tours.users.stripe_account_id,
    })

    // Create tip record
    const { error: tipError } = await supabase
      .from('tour_tips')
      .insert({
        tour_participant_id: tourParticipantId,
        amount,
        currency: guideCurrency,
        status: 'pending',
        payment_intent_id: paymentIntent.id,
        application_fee_amount: applicationFeeAmount
      })

    if (tipError) throw tipError

    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent.client_secret,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create payment intent' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 