import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';

// During SSR, provide a mock Supabase client that does nothing
const mockClient = {
  from: () => mockClient,
  select: () => mockClient,
  eq: () => mockClient,
  single: () => Promise.resolve({ data: null, error: null }),
  channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
  functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
} as any;

// Create the Supabase client only on the client side
export const supabase = typeof window === 'undefined' 
  ? mockClient 
  : createClient(
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