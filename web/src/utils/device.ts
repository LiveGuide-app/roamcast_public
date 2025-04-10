/**
 * Generates a unique device ID and stores it in localStorage
 * @returns A unique device ID
 */
export function getDeviceId(): string {
  // Check if we already have a device ID in localStorage
  const storedDeviceId = localStorage.getItem('deviceId');
  if (storedDeviceId) {
    return storedDeviceId;
  }

  // Generate a new device ID
  const deviceId = 'web-' + Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
  
  // Store the device ID in localStorage
  localStorage.setItem('deviceId', deviceId);
  
  return deviceId;
} 