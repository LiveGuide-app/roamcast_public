import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { getDeviceId } from '../utils/device';

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Generate LiveKit token
export async function generateLiveKitToken(tourId: string, role: 'guide' | 'listener' = 'listener') {
  try {
    // Get device ID for listeners
    let deviceId;
    if (role === 'listener') {
      deviceId = await getDeviceId();
    }

    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { 
        tourId,
        role,
        deviceId,
        metadata: {
          name: role,
        }
      }
    });

    if (error) {
      throw new Error(`Failed to get LiveKit token: ${error.message}`);
    }

    return data.token;
  } catch (error) {
    console.error('Error getting LiveKit token:', error);
    throw error;
  }
} 