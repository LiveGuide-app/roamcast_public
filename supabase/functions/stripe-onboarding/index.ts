import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { stripeOnboardingSchema } from '../_shared/schemas.ts'
import { validateRequest } from '../_shared/validation.ts'
import { sanitizeObject } from '../_shared/sanitization.ts'
import { rateLimit } from '../_shared/rate-limiting.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
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

    // Apply rate limiting
    const rateLimitResult = rateLimit(req, {
      maxRequests: 10, // 10 requests per minute
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.error }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse and sanitize request body if present
    let body = {};
    try {
      if (req.headers.get('Content-Type')?.includes('application/json')) {
        body = await req.json();
        body = sanitizeObject(body);
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      // Continue with empty body if parsing fails
    }

    // Validate request data if needed
    if (Object.keys(body).length > 0) {
      const validationResult = validateRequest(body, stripeOnboardingSchema);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ error: validationResult.error }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Stripe account
    const account = await stripe.accounts.create({
      type: 'standard',
      email: user.email,
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