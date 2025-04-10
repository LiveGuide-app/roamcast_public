import { getDeviceId as getStoredDeviceId } from '@/utils/device';

export class DeviceIdService {
  /**
   * Get the database-format device ID (UUID)
   */
  static async getDatabaseId(): Promise<string> {
    return await getStoredDeviceId();
  }

  /**
   * Get the LiveKit-format device ID
   */
  static getLiveKitId(databaseId: string): string {
    return `web-${databaseId.split('-')[0]}`;
  }

  /**
   * Convert LiveKit ID back to database ID
   * Note: This is a best-effort conversion as LiveKit IDs are truncated
   */
  static async getDatabaseIdFromLiveKitId(livekitId: string): Promise<string> {
    // If it's already a UUID, return it
    if (livekitId.includes('-')) {
      return livekitId;
    }
    
    // If it's a LiveKit ID, get the stored database ID
    return await this.getDatabaseId();
  }
} 