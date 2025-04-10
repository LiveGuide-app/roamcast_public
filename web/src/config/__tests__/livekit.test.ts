import { getLiveKitConfig } from '../livekit';

describe('LiveKit Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error if LIVEKIT_URL is not set', () => {
    delete process.env.LIVEKIT_URL;
    expect(() => getLiveKitConfig()).toThrow('LIVEKIT_URL is not set');
  });

  it('should throw error if LIVEKIT_API_KEY is not set', () => {
    process.env.LIVEKIT_URL = 'wss://test.livekit.io';
    delete process.env.LIVEKIT_API_KEY;
    expect(() => getLiveKitConfig()).toThrow('LIVEKIT_API_KEY is not set');
  });

  it('should return valid configuration when all environment variables are set', () => {
    process.env.LIVEKIT_URL = 'wss://test.livekit.io';
    process.env.LIVEKIT_API_KEY = 'test-api-key';

    const config = getLiveKitConfig();
    expect(config).toEqual({
      url: 'wss://test.livekit.io',
      apiKey: 'test-api-key',
    });
  });

  it('should handle different environment URLs correctly', () => {
    process.env.LIVEKIT_URL = 'wss://test.livekit.io';
    process.env.LIVEKIT_API_KEY = 'test-api-key';

    const config = getLiveKitConfig();
    expect(config.url).toMatch(/^wss:\/\//);
  });
}); 