# Background Audio Implementation for Tour Guides

## Overview
This document outlines the findings and implementation plan for enabling background audio in the Roamcast tour guide app. The goal is to allow tour guides to continue speaking via headphones even when the phone screen is locked, ensuring uninterrupted audio streaming during tours.

## Current Issue
The current implementation disconnects when the screen is locked, preventing tour guides from continuing their audio stream in the background. This is a critical feature for a tour guide app, as guides need to be able to focus on their surroundings while providing audio commentary.

## LiveKit Warning
During testing, a warning was observed when toggling the microphone:
```
WARN  could not find local track subscription for subscribed event {"pID": "PA_V5CA7pzkqEHy", "participant": "guide-499bd267-dba8-4519-a5d2-54883d826022", "room": "tour-499bd267-dba8-4519-a5d2-54883d826022", "roomID": "RM_URxkumrPxooa"}
```

This warning occurs:
1. When unmuting the microphone for the first time
2. When muting and unmuting the microphone again

Despite this warning, the audio transmits correctly, indicating this is a non-critical issue related to track subscription timing in LiveKit.

## Implementation Approach
We will implement a simplified approach that:
1. Keeps the app active when the screen is locked
2. Disconnects when the active tour loses focus (either switching to another app or navigating to another screen)
3. Reconnects when returning to an active tour

This approach simplifies the implementation while still meeting the core need of allowing guides to speak while looking at their surroundings.

## Background Audio Implementation Plan

### 1. iOS Configuration

For iOS, we need to:
- Enable background audio mode
- Configure audio session for background playback
- Add required permissions in Info.plist

### 2. Android Configuration

For Android, we need to:
- Configure audio session for background playback
- Add required permissions in AndroidManifest.xml

### 3. React Native Implementation

We need to:
- Configure the audio session for background playback
- Prevent the app from disconnecting when the screen is locked
- Handle app state changes (background/foreground transitions)
- Handle navigation state changes (leaving/returning to active tour)

## Expo EAS Considerations

Since we're building with Expo EAS (Expo Application Services), we need to consider the following:

1. **Expo Config Plugins**: We'll use Expo config plugins to modify native files instead of directly editing them.

2. **EAS Build Configuration**: We need to ensure our EAS build configuration includes the necessary permissions and capabilities.

3. **Expo Audio API**: We'll use the Expo Audio API for audio session management where possible.

## Detailed Implementation Plan

### 1. iOS Configuration

1. **Update app.json with Expo Config Plugins**:
   - Add background modes for audio
   - Configure audio session category

2. **Update Info.plist via Expo Config Plugins**:
   - Add `UIBackgroundModes` with `audio` value
   - Add `NSMicrophoneUsageDescription` for microphone access

### 2. Android Configuration

1. **Update AndroidManifest.xml via Expo Config Plugins**:
   - Add `WAKE_LOCK` permission
   - Configure audio session for background playback

### 3. React Native Implementation

1. **Configure Audio Session**:
   - Set audio session category to `playAndRecord`
   - Enable background audio mode
   - Configure audio session options for background playback

2. **Handle App State Changes**:
   - Listen for app state changes (background/foreground)
   - Disconnect when app goes to background (user switches to another app)
   - Reconnect when app comes back to foreground and tour is active

3. **Handle Navigation State Changes**:
   - Track when a user navigates away from an active tour
   - Disconnect when leaving an active tour
   - Reconnect when returning to an active tour

## Specific Code Changes Needed

1. **Update app.json with Expo Config Plugins**:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Roamcast needs access to your microphone to enable audio streaming during tours"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "NSMicrophoneUsageDescription": "Roamcast needs access to your microphone to enable audio streaming during tours"
      }
    },
    "android": {
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.WAKE_LOCK"
      ]
    }
  }
}
```

2. **Configure Audio Session with Expo Audio API**:
```typescript
import { Audio } from 'expo-av';

// In your useGuideLiveKit hook
const initializeAudio = useCallback(async () => {
  try {
    // Configure audio session for background playback during screen lock
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
    });
  } catch (error) {
    console.error('Failed to start audio session:', error);
    throw error;
  }
}, []);

const cleanupAudio = useCallback(async () => {
  try {
    // Reset audio mode when done
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    });
  } catch (error) {
    console.error('Failed to clean up audio session:', error);
  }
}, []);
```

3. **Handle App State Changes**:
```typescript
import { AppState, AppStateStatus } from 'react-native';

// In your useGuideLiveKit hook
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  
  return () => {
    subscription.remove();
  };
}, []);

const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (nextAppState === 'background' && state.isConnected) {
    // App went to background (user switched to another app), disconnect
    console.log('App went to background, disconnecting');
    disconnect().catch(console.error);
  } else if (nextAppState === 'active' && tour?.status === 'active') {
    // App came back to foreground and tour is active, reconnect
    console.log('App came back to foreground, reconnecting');
    connect().catch(console.error);
  }
};
```

4. **Handle Navigation State Changes**:
```typescript
import { useFocusEffect } from '@react-navigation/native';

// In your tour detail component
useFocusEffect(
  useCallback(() => {
    // Component is focused (user navigated to this screen)
    if (tour?.status === 'active' && !isConnected) {
      console.log('Navigated to active tour, connecting');
      connect().catch(console.error);
    }
    
    return () => {
      // Component is unfocused (user navigated away from this screen)
      if (isConnected) {
        console.log('Navigated away from active tour, disconnecting');
        disconnect().catch(console.error);
      }
    };
  }, [tour?.status, isConnected, connect, disconnect])
);
```

## Implementation Steps

1. **Update Configuration Files**:
   - Update app.json with Expo config plugins
   - Configure Info.plist and AndroidManifest.xml via Expo config plugins

2. **Update Audio Session Configuration**:
   - Modify the `initializeAudio` function to use Expo Audio API
   - Update the `cleanupAudio` function to properly clean up

3. **Implement App State Handling**:
   - Add app state change listener
   - Handle background/foreground transitions

4. **Implement Navigation State Handling**:
   - Add navigation state tracking
   - Handle leaving/returning to active tour

5. **Test on Both Platforms**:
   - Test on iOS devices with screen locked
   - Test on Android devices with screen locked
   - Verify audio continues to work in background
   - Test disconnection when switching to another app or navigating away from active tour
   - Test reconnection when returning to the app and navigating back to active tour

## User Experience Considerations

1. **Communicate Clearly to Users**: Make it clear that the app needs to be in the foreground for audio to work
2. **Provide Visual Indicators**: Show when the app is connected/disconnected
3. **Handle Reconnection Gracefully**: Ensure a smooth reconnection experience when users return to the app
4. **Handle Navigation Transitions**: Ensure smooth transitions when navigating between screens

## Benefits of This Approach

1. **Simpler Code**: Less complex implementation with fewer edge cases
2. **Better Battery Life**: The app won't consume resources when not actively being used
3. **More Predictable Behavior**: Users will understand that they need to keep the app in the foreground
4. **Fewer Platform-Specific Issues**: Less need to deal with complex background task handling
5. **Expo Compatibility**: Works seamlessly with Expo EAS build process

## Considerations

1. **Battery Usage**: Background audio will still consume more battery when the screen is locked. Consider adding a battery optimization warning.

2. **Platform Differences**: iOS and Android handle background tasks differently. The implementation needs to account for these differences.

3. **Audio Interruptions**: Handle audio interruptions (phone calls, other apps) gracefully.

4. **User Experience**: Provide clear UI indicators for connection status.

5. **Testing**: Thoroughly test on both platforms with different scenarios (screen lock, app switching, navigation).

6. **EAS Build Configuration**: Ensure the EAS build configuration includes the necessary permissions and capabilities.

## LiveKit Warning Resolution (Optional)

While the audio is working correctly despite the warning, the following changes could be made to address the warning:

1. **Add Track Event Handlers**:
```typescript
// Add these event handlers in your connect function
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  console.log('Track subscribed:', track.kind, 'from participant:', participant.identity);
});

room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
  console.log('Track unsubscribed:', track.kind, 'from participant:', participant.identity);
});

room.on(RoomEvent.TrackPublished, (publication, participant) => {
  console.log('Track published:', publication.kind, 'by participant:', participant.identity);
});

room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
  console.log('Track unpublished:', publication.kind, 'by participant:', participant.identity);
});
```

2. **Improve Microphone Toggle Logic**:
```typescript
const toggleMicrophone = useCallback(async (enabled: boolean) => {
  try {
    if (state.room?.localParticipant) {
      if (enabled) {
        // Initialize audio session first
        await initializeAudio();
        
        // Then enable microphone
        await state.room.localParticipant.setMicrophoneEnabled(enabled);
      } else {
        // Disable microphone first
        await state.room.localParticipant.setMicrophoneEnabled(enabled);
        
        // Then clean up audio session
        await cleanupAudio();
      }
      
      setState(prev => ({
        ...prev,
        isMicrophoneEnabled: enabled,
      }));
    }
  } catch (error) {
    console.error('Error toggling microphone:', error);
    throw error;
  }
}, [state.room?.localParticipant, initializeAudio, cleanupAudio]);
```

## Next Steps

1. Prioritize implementing background audio functionality for screen lock only
2. Test thoroughly on both iOS and Android devices
3. Address the LiveKit warning as a secondary task once background audio is working
4. Consider adding UI indicators for connection status
5. Implement battery optimization warnings 