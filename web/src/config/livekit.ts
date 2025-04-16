interface LiveKitConfig {
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
}

/**
 * Gets the LiveKit configuration based on the current environment
 * This function should only be used server-side.
 * @returns LiveKit configuration object
 */
export const getLiveKitConfig = (): LiveKitConfig => {
  // Ensure this is only called server-side
  if (typeof window !== 'undefined') {
    throw new Error('getLiveKitConfig should only be called server-side');
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;

  if (!apiKey) throw new Error('LIVEKIT_API_KEY is not set');
  if (!apiSecret) throw new Error('LIVEKIT_API_SECRET is not set');
  if (!wsUrl) throw new Error('NEXT_PUBLIC_LIVEKIT_WS_URL is not set');

  return {
    apiKey,
    apiSecret,
    wsUrl,
  };
}; 