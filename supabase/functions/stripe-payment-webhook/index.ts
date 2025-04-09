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

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', paymentIntent.id)
          .eq('stripe_account_id', event.account)
        break

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', failedPaymentIntent.id)
          .eq('stripe_account_id', event.account)
        break

      case 'payment_intent.processing':
        const processingPaymentIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', processingPaymentIntent.id)
          .eq('stripe_account_id', event.account)
        break

      case 'payment_intent.requires_payment_method':
        const requiresPaymentMethodIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'requires_payment_method',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', requiresPaymentMethodIntent.id)
          .eq('stripe_account_id', event.account)
        break

      case 'payment_intent.requires_confirmation':
        const requiresConfirmationIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'requires_confirmation',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', requiresConfirmationIntent.id)
          .eq('stripe_account_id', event.account)
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