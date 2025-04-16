import { getLiveKitConfig } from '../livekit';

describe('LiveKit Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Mock window to be undefined (server environment)
    global.window = undefined as any;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error if NEXT_PUBLIC_LIVEKIT_WS_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_LIVEKIT_WS_URL;
    expect(() => getLiveKitConfig()).toThrow('NEXT_PUBLIC_LIVEKIT_WS_URL is not set');
  });

  it('should throw error if LIVEKIT_API_KEY is not set', () => {
    process.env.NEXT_PUBLIC_LIVEKIT_WS_URL = 'wss://test.livekit.io';
    delete process.env.LIVEKIT_API_KEY;
    expect(() => getLiveKitConfig()).toThrow('LIVEKIT_API_KEY is not set');
  });

  it('should throw error if LIVEKIT_API_SECRET is not set', () => {
    process.env.NEXT_PUBLIC_LIVEKIT_WS_URL = 'wss://test.livekit.io';
    process.env.LIVEKIT_API_KEY = 'test-api-key';
    delete process.env.LIVEKIT_API_SECRET;
    expect(() => getLiveKitConfig()).toThrow('LIVEKIT_API_SECRET is not set');
  });

  it('should return valid configuration when all environment variables are set', () => {
    process.env.NEXT_PUBLIC_LIVEKIT_WS_URL = 'wss://test.livekit.io';
    process.env.LIVEKIT_API_KEY = 'test-api-key';
    process.env.LIVEKIT_API_SECRET = 'test-api-secret';

    const config = getLiveKitConfig();
    expect(config).toEqual({
      wsUrl: 'wss://test.livekit.io',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    });
  });

  it('should throw error when called from client-side', () => {
    // Mock window to be defined (client environment)
    global.window = {} as any;
    
    expect(() => getLiveKitConfig()).toThrow('getLiveKitConfig should only be called server-side');
  });
}); 