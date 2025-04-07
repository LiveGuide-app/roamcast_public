import { Room, RoomEvent, RemoteParticipant, LocalParticipant, setLogLevel, LogLevel } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getDeviceId } from '@/services/device';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// Set LiveKit logging to errors only
setLogLevel(LogLevel.error);

interface GuestLiveKitState {
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
}

export const useGuestLiveKit = (tourId: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<GuestLiveKitState>({
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
  });
  
  const connectingRef = useRef(false);
  const disconnectingRef = useRef(false);

  const getToken = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      console.log('🔑 Guest requesting token for tour:', tourId);
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
      console.error('❌ Guest token error:', error);
      throw error;
    }
  }, [tourId, user?.id, user?.email]);

  const disconnect = useCallback(async () => {
    // Prevent multiple simultaneous disconnections
    if (disconnectingRef.current || !state.room || state.isDisconnecting) {
      console.log('⏭️ Disconnect already in progress or not connected, skipping');
      return;
    }

    try {
      disconnectingRef.current = true;
      setState(prev => ({ ...prev, isDisconnecting: true }));
      
      console.log('🔌 Guest disconnecting from tour:', tourId);
      const room = state.room; // Store reference to avoid state changes during disconnect

      // Reset state first to prevent multiple disconnect events
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        isDisconnecting: true,
        room: null,
        localParticipant: null,
        remoteParticipants: [],
      }));

      // Then disconnect and cleanup
      await room.disconnect(true);
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
      console.error('❌ Error disconnecting from LiveKit room:', error);
    } finally {
      // Always reset flags
      disconnectingRef.current = false;
      connectingRef.current = false;
      setState(prev => ({ ...prev, isDisconnecting: false }));
    }
  }, [state.room, state.isDisconnecting, tourId]);

  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (connectingRef.current || state.isConnected || state.isDisconnecting) {
      console.log('⏭️ Connection already in progress or wrong state, skipping');
      return;
    }

    try {
      connectingRef.current = true;
      setState(prev => ({ ...prev, isConnecting: true }));
      
      // Initialize audio session before connecting
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
      
      console.log('🔄 Guest attempting to connect to tour:', tourId);
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
        if (!state.isDisconnecting) {
          console.log('✅ Guest connected to tour:', tourId);
          setState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            room,
            localParticipant: room.localParticipant,
            remoteParticipants: Array.from(room.remoteParticipants.values()),
          }));
          connectingRef.current = false;
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        // Only handle disconnect if this is still the current room and we're not already disconnecting
        if (room === state.room && !state.isDisconnecting) {
          console.log('🔌 Guest disconnected from tour:', tourId);
          setState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            room: null,
            localParticipant: null,
            remoteParticipants: [],
          }));
          connectingRef.current = false;
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        if (!state.isDisconnecting) {
          setState(prev => ({
            ...prev,
            remoteParticipants: Array.from(room.remoteParticipants.values()),
          }));
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        if (!state.isDisconnecting) {
          setState(prev => ({
            ...prev,
            remoteParticipants: Array.from(room.remoteParticipants.values()),
          }));
        }
      });

      await room.connect(wsUrl, token);
      return room;
    } catch (error) {
      console.error('❌ Guest connection error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        room: null,
        localParticipant: null,
        remoteParticipants: [],
      }));
      connectingRef.current = false;
      
      // Clean up audio session on error
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
      } catch (audioError) {
        console.error('❌ Error cleaning up audio session:', audioError);
      }
      
      throw error;
    }
  }, [getToken, tourId, state.isConnected, state.isDisconnecting]);

  // Handle app state changes
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' && state.isConnected && !state.isDisconnecting) {
      console.log('📱 Guest app to background, disconnecting');
      await disconnect();
    } else if (nextAppState === 'active' && !state.isConnected && !state.isConnecting && !state.isDisconnecting) {
      console.log('📱 Guest app to foreground, attempting reconnect');
      await connect();
    }
  }, [state.isConnected, state.isConnecting, state.isDisconnecting, connect, disconnect]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isConnected && !state.isDisconnecting) {
        disconnect();
      }
    };
  }, [disconnect, state.isConnected, state.isDisconnecting]);

  return {
    ...state,
    connect,
    disconnect,
  };
}; 