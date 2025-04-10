import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';

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