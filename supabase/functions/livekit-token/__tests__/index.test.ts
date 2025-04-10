import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';
import { liveKitTokenSchema } from '../_shared/schemas.ts';
import { Database } from '../_shared/database.types.ts';

// Mock environment variables
const mockEnv = {
  LIVEKIT_API_KEY: 'test-api-key',
  LIVEKIT_API_SECRET: 'test-api-secret',
};

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id' } }),
};

jest.mock('https://esm.sh/@supabase/supabase-js@2.7.1', () => ({
  createClient: jest.fn().mockReturnValue(mockSupabase),
}));

describe('LiveKit Token Generation', () => {
  let handler: typeof serve;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...mockEnv };
  });

  it('should return 405 for non-POST requests', async () => {
    const req = new Request('http://localhost:8000/livekit-token', {
      method: 'GET',
    });

    const response = await handler(req);
    expect(response.status).toBe(405);
  });

  it('should validate request body', async () => {
    const req = new Request('http://localhost:8000/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await handler(req);
    expect(response.status).toBe(400);
  });

  it('should check rate limiting', async () => {
    const req = new Request('http://localhost:8000/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        tourCode: 'test-tour',
      }),
    });

    // Mock rate limit exceeded
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { count: 11 }, // Exceeds rate limit of 10
    });

    const response = await handler(req);
    expect(response.status).toBe(429);
  });

  it('should generate token successfully', async () => {
    const req = new Request('http://localhost:8000/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        tourCode: 'test-tour',
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('token');
    expect(typeof data.token).toBe('string');
  });
}); 