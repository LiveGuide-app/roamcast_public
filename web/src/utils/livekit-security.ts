import { AccessToken } from 'livekit-server-sdk';
import { getLiveKitConfig } from '../config/livekit';

/**
 * Validates if a string is a valid JWT token
 * @param token The token to validate
 * @returns boolean indicating if the token is valid
 */
export function validateLiveKitToken(token: string | null): boolean {
  if (!token) return false;
  
  // Basic JWT format validation (header.payload.signature)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Try to decode the payload to ensure it's valid JSON
    if (parts[1]) {
      JSON.parse(atob(parts[1]));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a LiveKit token for a user to join a room
 * @param userId The user's ID
 * @param roomName The name of the room to join
 * @returns A signed JWT token for LiveKit authentication
 */
export async function generateLiveKitToken(userId: string, roomName: string): Promise<string> {
  if (!userId) throw new Error('userId is required');
  if (!roomName) throw new Error('roomName is required');

  const { apiKey, apiSecret } = getLiveKitConfig();
  
  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
  });
  
  at.addGrant({
    roomJoin: true,
    room: roomName,
  });

  return at.toJwt();
} 