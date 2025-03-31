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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create Stripe account
    const account = await stripe.accounts.create({
      type: 'standard',
      email: user.email,
      business_profile: {
        name: user.user_metadata?.full_name || 'Tour Guide',
      }
    })

    // Create account link for hosted onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://dashboard.stripe.com/test/connect/accounts/' + account.id,
      return_url: 'https://dashboard.stripe.com/test/connect/accounts/' + account.id,
      type: 'account_onboarding',
    })

    // Update guide's Stripe account ID
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: account.status,
        stripe_account_enabled: account.charges_enabled,
        stripe_account_created_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in Stripe onboarding:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to start onboarding' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 