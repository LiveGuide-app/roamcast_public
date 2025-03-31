import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

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