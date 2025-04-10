import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { stripeDashboardLinkSchema } from '../_shared/schemas.ts'
import { validateRequest } from '../_shared/validation.ts'
import { sanitizeObject } from '../_shared/sanitization.ts'

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

    // Parse and sanitize request body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, stripeDashboardLinkSchema);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { userId } = validationResult.data;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the user's Stripe account ID
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single()
      
    if (guideError || !guide || !guide.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Guide not found or not connected to Stripe' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create a dashboard link
    const link = await stripe.accounts.createLoginLink(guide.stripe_account_id);
    
    return new Response(
      JSON.stringify({ url: link.url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred creating your dashboard link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}) 