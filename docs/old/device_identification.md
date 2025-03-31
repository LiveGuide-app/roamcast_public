# Device Identification Strategy

## Overview
This document outlines the approach for uniquely identifying devices in the Roamcast application using UUIDs. This is crucial for tracking tour participants and ensuring each device has a unique identifier, even if multiple users are using the same device model.

## Implementation

### 1. Create a Device ID Service
Create a new service file `services/device.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@roamcast_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate new UUID if none exists
    const newId = uuidv4();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return 'unknown-device';
  }
}
```

### 2. Install Required Dependencies
```bash
npm install uuid @types/uuid
```

### 3. Usage in Tour Participation
The device ID service will be used in two places:

1. When joining a tour (`app/index.tsx`):
```typescript
import { getDeviceId } from '../services/device';

// In handleJoinTour:
const deviceId = await getDeviceId();
await createTourParticipant(tour.id, deviceId);
```

2. When leaving a tour (`app/(tour)/[code].tsx`):
```typescript
import { getDeviceId } from '../../services/device';

// In handleLeaveTour:
const deviceId = await getDeviceId();
await updateParticipantLeaveTime(tour.id, deviceId);
```

## Benefits
1. **Uniqueness**: Each device gets a truly unique identifier
2. **Persistence**: The ID remains the same across app restarts
3. **Privacy**: No device-specific information is exposed
4. **Reliability**: Works consistently across different device models and platforms

## Security Considerations
1. The device ID is stored locally and never shared with third parties
2. The ID is only used for tracking tour participation
3. No personal information is associated with the device ID
4. The ID is regenerated if the app is uninstalled and reinstalled

## Database Considerations
1. The `device_id` column in the `tour_participants` table should be indexed for performance
2. The column type should be `text` to accommodate UUID strings
3. Consider adding a unique constraint if you want to prevent multiple active participations from the same device

## Migration Strategy
If you need to migrate from an existing device identification system:
1. Add a new column `new_device_id` to the `tour_participants` table
2. Update the application code to use the new UUID-based system
3. Run a migration script to generate new IDs for existing participants
4. Remove the old device ID column after confirming successful migration

## Testing
1. Test device ID generation on fresh installs
2. Verify ID persistence across app restarts
3. Test tour participation with multiple devices
4. Verify ID regeneration after app uninstall/reinstall
5. Test concurrent tour participation from the same device

## Future Considerations
1. Consider adding a timestamp to track when the device ID was first generated
2. Implement a mechanism to handle device ID conflicts (extremely unlikely with UUID)
3. Add analytics to track device ID generation and usage patterns
4. Consider implementing a backup mechanism for device IDs 