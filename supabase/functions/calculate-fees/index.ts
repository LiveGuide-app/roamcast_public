import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  getFeeStructure, 
  calculateFees, 
  validateTipAmount, 
  validateCurrency 
} from '../_shared/fee-calculation.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get request body
    const { amount, currency } = await req.json();

    // Validate inputs
    if (!amount || !currency) {
      return new Response(
        JSON.stringify({ error: 'Amount and currency are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateTipAmount(amount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tip amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateCurrency(currency)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get fee structure
    const feeStructure = await getFeeStructure(supabase, currency);
    if (!feeStructure) {
      return new Response(
        JSON.stringify({ error: 'Fee structure not found for currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fees
    const fees = calculateFees(amount, feeStructure);

    return new Response(
      JSON.stringify(fees),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating fees:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate fees' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 