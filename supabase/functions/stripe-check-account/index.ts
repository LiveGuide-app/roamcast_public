import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('SUPABASE_STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { account_id } = await req.json();

    // If account_id is provided directly, use it for testing
    if (account_id) {
      try {
        // Fetch the latest account status directly from Stripe
        const account = await stripe.accounts.retrieve(account_id);
        return new Response(JSON.stringify({ account }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error retrieving Stripe account:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve Stripe account', details: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get the user's Stripe account ID
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData?.stripe_account_id) {
      return new Response(JSON.stringify({ error: 'Stripe account not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch the latest account status directly from Stripe
    const account = await stripe.accounts.retrieve(userData.stripe_account_id)

    return new Response(JSON.stringify({ account }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error checking Stripe account:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to check account status', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 