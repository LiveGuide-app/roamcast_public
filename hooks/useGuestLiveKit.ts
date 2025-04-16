import { Room, RoomEvent, RemoteParticipant, LocalParticipant, setLogLevel, LogLevel, Track, TrackPublication, RemoteTrackPublication } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getDeviceId } from '@/services/device';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import appLogger from '@/utils/appLogger';

// Set LiveKit logging to errors only
setLogLevel(LogLevel.error);

interface GuestLiveKitState {
  isConnected: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isDisconnecting: boolean;
}

export const useGuestLiveKit = (tourId: string, isActiveTour: boolean, hasLeft: boolean = false) => {
  const { user } = useAuth();
  const [state, setState] = useState<GuestLiveKitState>({
    isConnected: false,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
    isDisconnecting: false
  });
  const [isMuted, setIsMuted] = useState(false);
  const lastAppStateRef = useRef<AppStateStatus>('unknown');

  // Function to mute/unmute all audio tracks
  const toggleMute = useCallback(() => {
    if (!state.room) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);

    // Mute/unmute all audio tracks from remote participants
    state.room.remoteParticipants.forEach(participant => {
      participant.getTrackPublications().forEach(publication => {
        if (publication.kind === Track.Kind.Audio) {
          const remotePublication = publication as RemoteTrackPublication;
          remotePublication.setSubscribed(!newMuted);
        }
      });
    });
  }, [isMuted, state.room]);

  // Initialize audio session
  const initializeAudio = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,  // Guest doesn't need to record
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
      await AudioSession.startAudioSession();
    } catch (error) {
      appLogger.logError('Failed to start audio session:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, []);

  // Clean up audio session
  const cleanupAudio = useCallback(async () => {
    try {
      await AudioSession.stopAudioSession();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
    } catch (error) {
      appLogger.logError('Failed to stop audio session:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, []);

  const getToken = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      appLogger.logInfo('Guest requesting token for tour:', { tourId });
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { 
          tourId,
          role: 'listener',
          deviceId,
          metadata: {
            name: user?.email || 'guest',
            userId: user?.id
          }
        }
      });

      if (error) throw error;
      return data.token;
    } catch (error) {
      appLogger.logError('Guest token error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [tourId, user?.id, user?.email]);

  const connect = useCallback(async () => {
    if (state.isConnected) {
      appLogger.logInfo('Already connected, skipping connection');
      return;
    }

    try {
      await initializeAudio();
      
      appLogger.logInfo('Guest attempting to connect to tour:', { tourId });
      const token = await getToken();
      const wsUrl = EXPO_PUBLIC_LIVEKIT_WS_URL;

      if (!wsUrl) {
        throw new Error('LiveKit WebSocket URL not configured');
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        appLogger.logInfo('Guest connected to tour:', { tourId });
        setState(prev => ({
          ...prev,
          isConnected: true,
          room,
          localParticipant: room.localParticipant,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));

        // Apply mute state to any existing tracks
        if (isMuted) {
          room.remoteParticipants.forEach(participant => {
            participant.getTrackPublications().forEach(publication => {
              if (publication.kind === Track.Kind.Audio) {
                const remotePublication = publication as RemoteTrackPublication;
                remotePublication.setSubscribed(false);
              }
            });
          });
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        appLogger.logInfo('Guest disconnected from tour:', { tourId });
        setState(prev => ({
          ...prev,
          isConnected: false,
          room: null,
          localParticipant: null,
          remoteParticipants: [],
        }));
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        // Apply current mute state to new participant's tracks
        participant.getTrackPublications().forEach(publication => {
          if (publication.kind === Track.Kind.Audio) {
            const remotePublication = publication as RemoteTrackPublication;
            remotePublication.setSubscribed(!isMuted);
          }
        });

        setState(prev => ({
          ...prev,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        setState(prev => ({
          ...prev,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      await room.connect(wsUrl, token);
    } catch (error) {
      appLogger.logError('Guest connection error:', error instanceof Error ? error : new Error(String(error)));
      setState(prev => ({
        ...prev,
        isConnected: false,
        room: null,
        localParticipant: null,
        remoteParticipants: [],
      }));
      await cleanupAudio();
      throw error;
    }
  }, [getToken, tourId, initializeAudio, cleanupAudio, state.isConnected, isMuted]);

  const disconnect = useCallback(async () => {
    if (!state.isConnected || state.isDisconnecting) {
      appLogger.logInfo('Already disconnected or disconnecting, skipping disconnection');
      return;
    }

    try {
      setState(prev => ({ ...prev, isDisconnecting: true }));
      if (state.room) {
        appLogger.logInfo('Guest disconnecting from tour:', { tourId });
        await state.room.disconnect();
        await cleanupAudio();
        setState({
          isConnected: false,
          room: null,
          localParticipant: null,
          remoteParticipants: [],
          isDisconnecting: false
        });
      }
    } catch (error) {
      appLogger.logError('Error disconnecting from LiveKit room:', error instanceof Error ? error : new Error(String(error)));
      setState(prev => ({ ...prev, isDisconnecting: false }));
      throw error;
    }
  }, [state.room, state.isConnected, state.isDisconnecting, cleanupAudio, tourId]);

  // Handle tour state changes
  useEffect(() => {
    const shouldConnect = isActiveTour && !hasLeft && !state.isConnected && !state.isDisconnecting;
    const shouldDisconnect = (!isActiveTour || hasLeft) && state.isConnected && !state.isDisconnecting;

    if (shouldConnect) {
      appLogger.logInfo('Tour is active and not left, connecting guest');
      connect().catch((error) => {
        appLogger.logError('Connection error:', error instanceof Error ? error : new Error(String(error)));
      });
    } else if (shouldDisconnect) {
      appLogger.logInfo('Tour is not active or left, disconnecting guest');
      disconnect().catch((error) => {
        appLogger.logError('Disconnection error:', error instanceof Error ? error : new Error(String(error)));
      });
    }
  }, [isActiveTour, hasLeft, state.isConnected, state.isDisconnecting, connect, disconnect]);

  // Handle app state changes - simplified to maintain connection
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    appLogger.logInfo('Guest app state changed:', { 
      from: lastAppStateRef.current, 
      to: nextAppState 
    });

    // Only reconnect if needed when coming back to foreground
    if (nextAppState === 'active' && lastAppStateRef.current === 'background') {
      if (isActiveTour && !hasLeft && !state.isConnected && !state.isDisconnecting) {
        appLogger.logInfo('Guest app to foreground, reconnecting to active tour if needed');
        await connect();
      }
    }

    lastAppStateRef.current = nextAppState;
  }, [state.isConnected, state.isDisconnecting, isActiveTour, hasLeft, connect]);

  useEffect(() => {
    // Initialize the lastAppStateRef with the current app state
    lastAppStateRef.current = AppState.currentState;
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up the connection when unmounting
      disconnect().catch((error) => {
        appLogger.logError('Cleanup disconnect error:', error instanceof Error ? error : new Error(String(error)));
      });
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    isMuted,
    toggleMute
  };
}; 