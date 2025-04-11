/**
 * Generates a unique device ID and stores it in localStorage
 * @returns A unique device ID in UUID format
 */
export function getDeviceId(): string {
  // Check if we already have a device ID in localStorage
  const storedDeviceId = localStorage.getItem('deviceId');
  if (storedDeviceId) {
    return storedDeviceId;
  }

  // Generate a new UUID v4
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  // Store the device ID in localStorage
  localStorage.setItem('deviceId', uuid);
  
  return uuid;
} 