import { getDeviceId } from '@/services/device';

// Base headers that will be included in all requests
const getBaseHeaders = async () => {
  const deviceId = await getDeviceId();
  return {
    'x-device-id': deviceId,
    'Content-Type': 'application/json',
  };
};

// Wrapper around fetch that adds device ID header
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...(await getBaseHeaders()),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

// Helper function to handle JSON responses
export async function apiFetchJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
} 