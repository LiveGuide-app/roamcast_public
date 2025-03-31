# LiveKit Client Integration Plan

## Overview
This document outlines the implementation plan for integrating LiveKit's client SDK into the Roamcast application, specifically for the tour guide's real-time audio streaming functionality.

## Current Architecture
- We have a LiveKit server running
- We have a Supabase edge function (`livekit-token`) that generates tokens for both guides and listeners
- The tour guide interface (`[tourId].tsx`) currently handles tour status management
- We're using Expo Router for navigation

## Important Expo Considerations
- The LiveKit SDK is not compatible with Expo Go due to native code requirements
- We need to use `expo-dev-client` and build locally for development
- We need to register WebRTC globals in our app
- We need to set up device permissions for microphone access

## Implementation Plan

### 1. Dependencies and Setup
- Install required packages:
  ```bash
  npm install @livekit/react-native @livekit/react-native-expo-plugin @livekit/react-native-webrtc @config-plugins/react-native-webrtc
  ```
- Update `app.json` to include required plugins:
  ```json
  {
    "expo": {
      "plugins": [
        "@livekit/react-native-expo-plugin",
        "@config-plugins/react-native-webrtc"
      ],
      "ios": {
        "infoPlist": {
          "NSMicrophoneUsageDescription": "Roamcast needs access to your microphone to enable audio streaming during tours",
          "UIBackgroundModes": ["audio"]
        }
      },
      "android": {
        "permissions": ["android.permission.RECORD_AUDIO"]
      }
    }
  }
  ```
- Add LiveKit WebSocket URL to environment configuration
- Update TypeScript types for LiveKit integration
- Register globals in app/_layout.tsx (root layout):
  ```typescript
  import { registerGlobals } from '@livekit/react-native';
  import { Stack } from 'expo-router';
  import { AuthProvider } from '../components/auth/AuthContext';
  import { ProtectedRoute } from '../components/ProtectedRoute';

  // Register LiveKit globals before the app renders
  registerGlobals();

  export default function RootLayout() {
    return (
      <AuthProvider>
        <ProtectedRoute>
          <Stack>
            {/* ... existing Stack.Screen components ... */}
          </Stack>
        </ProtectedRoute>
      </AuthProvider>
    );
  }
  ```

### 2. State Management
Add new state variables to the tour guide interface:
```typescript
interface LiveKitState {
  isConnected: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isMicrophoneEnabled: boolean;
}
```

### 3. Token Generation and Room Connection
#### New Functions to Create:
- `getLiveKitToken(tourId: string)`: Fetches token from Supabase edge function
- `connectToRoom(token: string)`: Handles LiveKit room connection
- `setupRoomEventListeners(room: Room)`: Sets up event handlers for room events
- `requestMicrophonePermission()`: Handles microphone permission request
- `toggleMicrophone(enabled: boolean)`: Toggles microphone state

#### Modified Functions:
- `handleStartTour()`: 
  1. Request microphone permission
  2. Update tour status to 'active'
  3. Get LiveKit token
  4. Connect to room
  5. Set up event listeners
  6. Enable microphone

### 4. Room Disconnection
#### Modified Functions:
- `handleEndTour()`:
  1. Disable microphone
  2. Disconnect from LiveKit room
  3. Update tour status to 'completed'
  4. Navigate away

### 5. UI Updates
#### New Components:
- Connection status indicator
- Participant count display
- Enhanced microphone controls
- Permission request dialog

#### Modified Components:
- Update microphone controls to work with LiveKit's audio tracks
- Add visual feedback for connection status
- Show active listener count
- Add permission status indicators

## Track Management Strategy

### Track Naming and Identification
```typescript
// Room name format
const roomName = `tour-${tourId}`;

// Participant identities
const guideIdentity = `guide-${tourId}`;
const listenerIdentity = `listener-${deviceId}`;

// Track source
const trackSource = Track.Source.Microphone;
```

### Guide Audio Track Management
The tour guide interface will manage a single audio track:

```typescript
import { AudioSession } from '@livekit/react-native';

interface AudioTrackState {
  isEnabled: boolean;
  isMuted: boolean;
  track: LocalTrack | null;
}

// Initialize audio session before any audio operations
const initializeAudio = async () => {
  try {
    await AudioSession.startAudioSession();
  } catch (error) {
    console.error('Failed to start audio session:', error);
    // Handle error appropriately
  }
};

// Clean up audio session when done
const cleanupAudio = async () => {
  try {
    await AudioSession.stopAudioSession();
  } catch (error) {
    console.error('Failed to stop audio session:', error);
    // Handle error appropriately
  }
};

// Starting the tour
const startTour = async () => {
  // Initialize audio session first
  await initializeAudio();
  
  // Then enable microphone which creates and publishes the track
  await room.localParticipant.setMicrophoneEnabled(true);
};

// Mute/Unmute during tour
const toggleMicrophone = async (enabled: boolean) => {
  await room.localParticipant.setMicrophoneEnabled(enabled);
};

// Ending the tour
const endTour = async () => {
  // Disable microphone which stops and unpublishes the track
  await room.localParticipant.setMicrophoneEnabled(false);
  
  // Clean up audio session
  await cleanupAudio();
};
```

### Listener Track Subscription
Listeners will automatically receive and play the guide's audio track:

```typescript
// In the listener's room connection setup
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Audio) {
    // Track is automatically handled by LiveKit
    // Update UI to show guide is speaking
  }
});

// Handle mute/unmute events
room.on(RoomEvent.TrackMuted, (track, participant) => {
  // Update UI to show guide is muted
});

room.on(RoomEvent.TrackUnmuted, (track, participant) => {
  // Update UI to show guide is speaking
});
```

### Track Permissions
Permissions are enforced at multiple levels:

1. **Token Level**:
   - Guides: Can publish audio
   - Listeners: Can only subscribe to audio

2. **Room Level**:
   - Guides are identified by their role
   - Only one guide can publish audio per room
   - All listeners can subscribe to the guide's audio

3. **Device Level**:
   - Microphone permissions are requested when needed
   - Permission state is persisted by the device

### Track Quality Configuration
For optimal audio quality in tour scenarios:

```typescript
const roomOptions = {
  adaptiveStream: true,
  dynacast: true,
  // Audio optimization for voice
  audioPreset: {
    name: 'voice',
    maxBitrate: 20000,
    priority: Track.Priority.High
  }
};
```

## Implementation Steps

### Step 1: Setup and Configuration
1. Install LiveKit SDK and dependencies
2. Configure Expo plugins in app.json
3. Set up device permissions in app.json
4. Set up expo-dev-client for development
5. Add environment variables
6. Create TypeScript types
7. Register globals in app/_layout.tsx (root layout)

### Step 2: LiveKit Hook Development
1. Create custom hook for LiveKit room management
2. Implement token fetching
3. Implement room connection/disconnection
4. Add event listeners
5. Handle audio session management
6. Implement permission handling

### Step 3: Tour Guide Interface Updates
1. Integrate LiveKit hook
2. Update tour status management
3. Implement audio controls
4. Add connection status indicators
5. Add permission request flow

### Step 4: UI Enhancement
1. Add participant count display
2. Implement connection status UI
3. Update microphone controls
4. Add error handling UI
5. Add permission status indicators

## Technical Considerations

### Error Handling
- Handle connection failures
- Manage token expiration
- Handle network disconnections
- Provide user feedback for errors
- Handle permission denials
- Handle permission revocations

### Performance
- Optimize room connection/disconnection
- Manage audio track quality
- Handle background/foreground app state
- Use adaptive streaming for different screen densities

### Security
- Secure token storage
- Validate room access
- Handle unauthorized connections
- Handle permission states

## Testing Plan
1. Test room connection/disconnection
2. Test audio functionality
3. Test error scenarios
4. Test network resilience
5. Test background/foreground transitions
6. Test on different Expo development builds
7. Test permission flows
8. Test permission revocation scenarios

## Future Considerations
- Add video support if needed
- Implement chat functionality
- Add recording capabilities
- Implement listener management features

## Dependencies
- @livekit/react-native
- @livekit/react-native-expo-plugin
- @livekit/react-native-webrtc
- @config-plugins/react-native-webrtc
- expo-dev-client
- React Native environment configuration
- Supabase client
- TypeScript types for LiveKit

## Timeline
1. Setup and Configuration: 2 days
2. LiveKit Hook Development: 2 days
3. Tour Guide Interface Updates: 2 days
4. UI Enhancement: 1 day
5. Testing and Bug Fixes: 2 days

Total estimated time: 9 days 