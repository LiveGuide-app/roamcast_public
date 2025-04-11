import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.17.0/deno/stripe.mjs'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// This is needed in order to use the Web Crypto API in Deno.
const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_TIP_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )

    // Check if this is a Connect account event
    const isConnectEvent = event.account !== undefined

    // If it's not a Connect event and we're expecting one, ignore it
    if (!isConnectEvent) {
      console.log('Received non-Connect event, ignoring:', event.type)
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let updateResult;
    console.log('Processing event type:', event.type)

    switch (event.type) {
      // Checkout Session handlers (web app flow)
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        const successSession = event.data.object as Stripe.Checkout.Session
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('checkout_session_id', successSession.id)
          .eq('stripe_account_id', event.account)
        console.log('Checkout session succeeded update result:', updateResult)
        break

      case 'checkout.session.expired':
        const expiredSession = event.data.object as Stripe.Checkout.Session
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('checkout_session_id', expiredSession.id)
          .eq('stripe_account_id', event.account)
        console.log('Checkout session expired update result:', updateResult)
        break

      case 'checkout.session.async_payment_failed':
        const failedSession = event.data.object as Stripe.Checkout.Session
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('checkout_session_id', failedSession.id)
          .eq('stripe_account_id', event.account)
        console.log('Checkout session failed update result:', updateResult)
        break

      // Payment Intent handlers (native app flow)
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // For native app flow, we use payment_intent_id
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', paymentIntent.id)
          .eq('stripe_account_id', event.account)
        console.log('Payment intent succeeded update result:', updateResult)
        break

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', failedPaymentIntent.id)
          .eq('stripe_account_id', event.account)
        console.log('Payment intent failed update result:', updateResult)
        break

      case 'payment_intent.processing':
        const processingPaymentIntent = event.data.object as Stripe.PaymentIntent
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', processingPaymentIntent.id)
          .eq('stripe_account_id', event.account)
        console.log('Payment intent processing update result:', updateResult)
        break

      case 'payment_intent.requires_payment_method':
        const requiresPaymentMethodIntent = event.data.object as Stripe.PaymentIntent
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'requires_payment_method',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', requiresPaymentMethodIntent.id)
          .eq('stripe_account_id', event.account)
        console.log('Payment intent requires payment method update result:', updateResult)
        break

      case 'payment_intent.requires_confirmation':
        const requiresConfirmationIntent = event.data.object as Stripe.PaymentIntent
        updateResult = await supabase
          .from('tour_tips')
          .update({
            status: 'requires_confirmation',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', requiresConfirmationIntent.id)
          .eq('stripe_account_id', event.account)
        console.log('Payment intent requires confirmation update result:', updateResult)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 