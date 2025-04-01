import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

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

    // Get request body
    const { tourParticipantId, amount, currency, deviceId } = await req.json()
    
    console.log('Request body:', { tourParticipantId, amount, currency, deviceId })

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

    // Check for any pending tips and their payment intents
    const { data: pendingTips } = await supabase
      .from('tour_tips')
      .select('payment_intent_id, status')
      .eq('tour_participant_id', tourParticipantId)
      .in('status', ['pending', 'requires_payment_method', 'requires_confirmation'])

    // Cancel any existing pending payment intents
    if (pendingTips && pendingTips.length > 0) {
      console.log('Found existing pending tips:', pendingTips);
      
      for (const tip of pendingTips) {
        try {
          // Only cancel if the payment intent exists and is still valid
          const paymentIntent = await stripe.paymentIntents.retrieve(
            tip.payment_intent_id,
            { stripeAccount: participant.tours.users.stripe_account_id }
          );
          
          if (paymentIntent && paymentIntent.status !== 'canceled') {
            console.log('Cancelling payment intent:', tip.payment_intent_id);
            await stripe.paymentIntents.cancel(
              tip.payment_intent_id,
              { cancellation_reason: 'abandoned' },
              { stripeAccount: participant.tours.users.stripe_account_id }
            );
          }
          
          // Update tip status in database
          await supabase
            .from('tour_tips')
            .update({ status: 'cancelled' })
            .eq('payment_intent_id', tip.payment_intent_id);
            
        } catch (error) {
          console.error('Error handling existing payment intent:', error);
          // Continue with the rest even if one fails
        }
      }
    }

    if (!participant.tours.users.stripe_account_enabled) {
      return new Response(
        JSON.stringify({ error: 'Guide has not enabled payments' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const guideCurrency = participant.tours.users.stripe_default_currency || currency
    const applicationFeeAmount = Math.round(amount * 0.05)
    const stripeAccount = participant.tours.users.stripe_account_id

    try {
      // Create a new customer each time
      const customer = await stripe.customers.create({
        metadata: {
          deviceId,
          tourParticipantId
        }
      }, {
        stripeAccount
      });
      
      const customerId = customer.id;
      console.log('Created new customer:', customerId);

      // Create an ephemeral key for the customer
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { 
          apiVersion: '2023-10-16',
          stripeAccount 
        }
      );

      console.log('Created ephemeral key for customer:', {
        hasEphemeralKey: !!ephemeralKey,
        customerId: customerId
      });

      // Create payment intent
      console.log('Creating payment intent with:', {
        amount,
        currency: guideCurrency,
        customer: customerId,
        application_fee_amount: applicationFeeAmount,
        stripeAccount
      });
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: guideCurrency,
        customer: customerId,
        payment_method_types: ['card'],
        application_fee_amount: applicationFeeAmount,
        metadata: {
          tourParticipantId,
          tourId: participant.tour_id,
          guideId: participant.tours.users.id,
          originalCurrency: currency,
          guideCurrency,
          deviceId,
        }
      }, {
        stripeAccount
      });

      console.log('Payment intent created successfully:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret ? 'present' : 'missing',
        customerSet: paymentIntent.customer === customerId,
        stripeAccount
      });

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

      if (tipError) {
        console.error('Error creating tip record:', tipError)
        throw tipError
      }

      // Return all the necessary data for the payment sheet
      const response = {
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      };
      
      console.log('Returning response with:', {
        hasPaymentIntent: !!response.paymentIntent,
        hasEphemeralKey: !!response.ephemeralKey,
        hasCustomer: !!response.customer,
        hasPublishableKey: !!response.publishableKey
      });
      
      return new Response(
        JSON.stringify(response),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch (stripeError) {
      console.error('Stripe API error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        decline_code: stripeError.decline_code,
        raw: stripeError.raw,
        payment_method_types: stripeError.payment_method_types,
        available_payment_method_types: stripeError.available_payment_method_types,
        stack: stripeError.stack
      })
      throw stripeError
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create payment intent' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 