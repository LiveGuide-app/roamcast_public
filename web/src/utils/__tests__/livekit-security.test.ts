import { validateLiveKitToken, generateLiveKitToken } from '../livekit-security';
import { AccessToken } from 'livekit-server-sdk';
import { getLiveKitConfig } from '../../config/livekit';

// Mock the LiveKit config
jest.mock('../../config/livekit', () => ({
  getLiveKitConfig: jest.fn(),
}));

describe('LiveKit Security Utilities', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    wsUrl: 'wss://test.livekit.io',
  };

  beforeEach(() => {
    (getLiveKitConfig as jest.Mock).mockReturnValue(mockConfig);
    // Mock window to be undefined (server environment)
    global.window = undefined as any;
  });

  afterAll(() => {
    // Reset window
    global.window = window;
  });

  describe('validateLiveKitToken', () => {
    it('should return true for a valid JWT token', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(validateLiveKitToken(validToken)).toBe(true);
    });

    it('should return false for an invalid JWT token', () => {
      const invalidToken = 'not-a-jwt-token';
      expect(validateLiveKitToken(invalidToken)).toBe(false);
    });

    it('should return false for null token', () => {
      expect(validateLiveKitToken(null)).toBe(false);
    });
  });

  describe('generateLiveKitToken', () => {
    it('should generate a valid LiveKit token in server environment', async () => {
      const userId = 'test-user';
      const roomName = 'test-room';
      
      const token = await generateLiveKitToken(userId, roomName);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(validateLiveKitToken(token)).toBe(true);
      
      // Verify token contents
      const decodedToken = AccessToken.fromString(token);
      expect(decodedToken.identity).toBe(userId);
      expect(decodedToken.grants.roomJoin).toBe(true);
      expect(decodedToken.grants.room).toBe(roomName);
    });

    it('should throw error if called from client-side', async () => {
      // Mock window to be defined (client environment)
      global.window = {} as any;
      
      await expect(generateLiveKitToken('test-user', 'test-room'))
        .rejects
        .toThrow('generateLiveKitToken can only be called server-side');
    });

    it('should throw error if LiveKit config is missing', async () => {
      (getLiveKitConfig as jest.Mock).mockReturnValue({
        apiKey: '',
        apiSecret: '',
        wsUrl: '',
      });

      await expect(generateLiveKitToken('test-user', 'test-room')).rejects.toThrow();
    });
  });
}); 