export const config = {
  livekit: {
    wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || '',
    apiKey: process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || '',
    apiSecret: process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET || '',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
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
    NEXT_PUBLIC_LIVEKIT_API_SECRET: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  }
} 