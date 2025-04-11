import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';

// Create the Supabase client
// During SSR, this will be initialized but won't be used for real operations
// since the client-side code that uses it won't run during SSR
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Accept': 'application/json',
      },
    },
  }
); 