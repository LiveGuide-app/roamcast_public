import { Room, RoomEvent, RemoteParticipant, LocalParticipant, setLogLevel, LogLevel } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { useState, useCallback, useEffect } from 'react';
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
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isDisconnecting: boolean;
}

export const useGuestLiveKit = (tourId: string, isActiveTour: boolean) => {
  const { user } = useAuth();
  const [state, setState] = useState<GuestLiveKitState>({
    isConnected: false,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
    isDisconnecting: false
  });

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
      console.error('Failed to start audio session:', error);
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
      console.error('Failed to stop audio session:', error);
      throw error;
    }
  }, []);

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

  const connect = useCallback(async () => {
    if (state.isConnected) {
      console.log('Already connected, skipping connection');
      return;
    }

    try {
      await initializeAudio();
      
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
        console.log('✅ Guest connected to tour:', tourId);
        setState(prev => ({
          ...prev,
          isConnected: true,
          room,
          localParticipant: room.localParticipant,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 Guest disconnected from tour:', tourId);
        setState(prev => ({
          ...prev,
          isConnected: false,
          room: null,
          localParticipant: null,
          remoteParticipants: [],
        }));
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
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
      console.error('❌ Guest connection error:', error);
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
  }, [getToken, tourId, initializeAudio, cleanupAudio, state.isConnected]);

  const disconnect = useCallback(async () => {
    if (!state.isConnected || state.isDisconnecting) {
      console.log('Already disconnected or disconnecting, skipping disconnection');
      return;
    }

    try {
      setState(prev => ({ ...prev, isDisconnecting: true }));
      if (state.room) {
        console.log('🔌 Guest disconnecting from tour:', tourId);
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
      console.error('Error disconnecting from LiveKit room:', error);
      setState(prev => ({ ...prev, isDisconnecting: false }));
      throw error;
    }
  }, [state.room, state.isConnected, state.isDisconnecting, cleanupAudio, tourId]);

  // Handle tour state changes
  useEffect(() => {
    if (isActiveTour && !state.isConnected && !state.isDisconnecting) {
      console.log('Tour is active, connecting guest');
      connect().catch(console.error);
    } else if (!isActiveTour && state.isConnected && !state.isDisconnecting) {
      console.log('Tour is not active, disconnecting guest');
      disconnect().catch(console.error);
    }
  }, [isActiveTour, state.isConnected, state.isDisconnecting, connect, disconnect]);

  // Handle app state changes
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' && state.isConnected && !state.isDisconnecting) {
      console.log('📱 Guest app to background, disconnecting');
      await disconnect();
    } else if (nextAppState === 'active' && isActiveTour && !state.isConnected && !state.isDisconnecting) {
      console.log('📱 Guest app to foreground, reconnecting to active tour');
      await connect();
    }
  }, [state.isConnected, state.isDisconnecting, isActiveTour, connect, disconnect]);

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
        disconnect().catch(console.error);
      }
    };
  }, [disconnect, state.isConnected, state.isDisconnecting]);

  return {
    ...state,
    connect,
    disconnect,
  };
}; 