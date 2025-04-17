export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ENVIRONMENT') === 'production'
    ? 'https://join.tryroamcast.com'
    : ['http://localhost:3000', 'http://localhost:19006', 'https://staging.tryroamcast.com'].includes(Deno.env.get('ORIGIN') || '')
      ? Deno.env.get('ORIGIN')
      : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedOrigins = Deno.env.get('ENVIRONMENT') === 'production'
  ? ['https://join.tryroamcast.com']
  : ['http://localhost:3000', 'http://localhost:19006', 'https://staging.tryroamcast.com']; 