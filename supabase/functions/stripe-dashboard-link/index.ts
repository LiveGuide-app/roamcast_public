import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { stripeDashboardLinkSchema } from '../_shared/schemas.ts'
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
      maxRequests: 20, // 20 requests per minute
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

    // Try to parse request body if present
    let userId = user.id;
    try {
      if (req.headers.get('Content-Type')?.includes('application/json')) {
        const body = await req.json();
        const sanitizedBody = sanitizeObject(body);
        
        // Validate request data
        const validationResult = validateRequest(sanitizedBody, stripeDashboardLinkSchema);
        if (validationResult.success) {
          userId = validationResult.data.userId;
        }
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      // Continue with user ID from auth header if parsing fails
    }

    // Get guide's Stripe account ID
    const { data: guide, error: guideError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (guideError || !guide?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Stripe account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a direct link to the Stripe dashboard for the connected account
    // For Standard accounts, we can use a direct URL to the dashboard
    const dashboardUrl = `https://dashboard.stripe.com/test/connect/accounts/${guide.stripe_account_id}`;

    return new Response(JSON.stringify({ url: dashboardUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating dashboard link:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create dashboard link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 