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

    // Get guide's Stripe account ID
    const { data: guide, error: guideError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (guideError || !guide?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Stripe account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Construct the Stripe dashboard URL for Standard account
    const dashboardUrl = `https://dashboard.stripe.com/b/${guide.stripe_account_id}`

    return new Response(JSON.stringify({ url: dashboardUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating dashboard link:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create dashboard link',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 