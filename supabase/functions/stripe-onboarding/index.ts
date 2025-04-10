import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { stripeOnboardingSchema } from '../_shared/schemas.ts'
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
    const validationResult = validateRequest(sanitizedBody, stripeOnboardingSchema);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { userId, returnUrl } = validationResult.data;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the user's email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${returnUrl}?error=true`,
      return_url: `${returnUrl}?success=true`,
      type: 'account_onboarding',
    });
    
    // Update the user's Stripe account ID
    const { error: updateError } = await supabase
      .from('tour_guides')
      .update({ 
        stripe_account_id: account.id,
        stripe_account_status: 'pending',
      })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating guide:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error updating guide' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred creating your Stripe account' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}) 