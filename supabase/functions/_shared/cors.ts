export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('DENO_ENV') === 'production' 
    ? 'https://join.tryroamcast.com' 
    : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 