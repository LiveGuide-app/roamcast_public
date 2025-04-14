'use client';

// During SSR, use placeholder values that won't cause Supabase to throw
const getSupabaseConfig = () => {
  if (typeof window === 'undefined') {
    return {
      url: 'http://placeholder-url',
      anonKey: 'placeholder-key'
    };
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  };
};

export const config = {
  livekit: {
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || '',
    apiKey: process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || '',
  },
  supabase: getSupabaseConfig(),
  app: {
    name: 'Roamcast Web',
    version: '1.0.0',
  },
} as const;

// Type-safe environment variables
declare global {
  interface ProcessEnv {
    NEXT_PUBLIC_LIVEKIT_WS_URL: string;
    NEXT_PUBLIC_LIVEKIT_API_KEY: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  }
} 