import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received webhook request')
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('Missing stripe-signature header')
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    const body = await req.text()
    console.log('Webhook body:', body)

    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!
      )
      console.log('Constructed event:', event.type)

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      switch (event.type) {
        case 'account.updated':
          const account = event.data.object as Stripe.Account
          console.log('Processing account.updated:', account.id)
          const { error: updateError } = await supabase
            .from('users')
            .update({
              stripe_account_enabled: account.charges_enabled,
              stripe_payouts_enabled: account.payouts_enabled,
              stripe_details_submitted: account.details_submitted,
              stripe_account_updated_at: new Date().toISOString(),
              stripe_default_currency: account.default_currency || 'usd',
            })
            .eq('stripe_account_id', account.id)
          
          if (updateError) {
            console.error('Error updating user:', updateError)
            throw updateError
          }
          break

        case 'account.application.deauthorized':
          const deauthAccount = event.data.object as Stripe.Account
          console.log('Processing account.application.deauthorized:', deauthAccount.id)
          const { error: deauthError } = await supabase
            .from('users')
            .update({
              stripe_account_enabled: false,
              stripe_payouts_enabled: false,
              stripe_account_updated_at: new Date().toISOString(),
            })
            .eq('stripe_account_id', deauthAccount.id)
          
          if (deauthError) {
            console.error('Error updating user on deauthorization:', deauthError)
            throw deauthError
          }
          break
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      })
    } catch (err) {
      console.error('Error constructing event:', err)
      throw err
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook handler failed' }),
      { 
        status: 400, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
}) 