'use client';

import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';

// Create the Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
    global: {
      headers: {
        'Accept': 'application/json',
      },
    },
  }
); 