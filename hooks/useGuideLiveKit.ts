import { Room, RoomEvent, RemoteParticipant, LocalParticipant, RoomOptions, setLogLevel, LogLevel } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// Set LiveKit logging to errors only
setLogLevel(LogLevel.error);

interface GuideLiveKitState {
  isConnected: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isMicrophoneEnabled: boolean;
}

export const useGuideLiveKit = (tourId: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<GuideLiveKitState>({
    isConnected: false,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
    isMicrophoneEnabled: false,
  });

  // Initialize audio session
  const initializeAudio = useCallback(async () => {
    try {
      // Configure audio session for background playback during screen lock
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: true,  // Guide needs to record
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });

      // Start LiveKit audio session
      await AudioSession.startAudioSession();
    } catch (error) {
      console.error('Failed to start audio session:', error);
      throw error;
    }
  }, []);

  // Clean up audio session
  const cleanupAudio = useCallback(async () => {
    try {
      // Stop LiveKit audio session
      await AudioSession.stopAudioSession();

      // Reset audio mode
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
      console.log('🔑 Guide requesting token for tour:', tourId);
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { 
          tourId,
          role: 'guide',
          metadata: {
            name: user?.email || 'guide',
            userId: user?.id
          }
        }
      });

      if (error) throw error;
      return data.token;
    } catch (error) {
      console.error('❌ Guide token error:', error);
      throw error;
    }
  }, [tourId, user?.id, user?.email]);

  const connect = useCallback(async () => {
    try {
      console.log('🔄 Guide attempting to connect to tour:', tourId);
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
        console.log('✅ Guide connected to tour:', tourId);
        setState(prev => ({
          ...prev,
          isConnected: true,
          room,
          localParticipant: room.localParticipant,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));

        // Update room start time in tours table
        supabase
          .from('tours')
          .update({ room_started_at: new Date().toISOString() })
          .eq('id', tourId)
          .then(
            () => {},
            error => console.error('❌ Failed to update room start time:', error)
          );
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 Guide disconnected from tour:', tourId);
        setState(prev => ({
          ...prev,
          isConnected: false,
          room: null,
          localParticipant: null,
          remoteParticipants: [],
        }));

        // Update room finish time in tours table
        supabase
          .from('tours')
          .update({ room_finished_at: new Date().toISOString() })
          .eq('id', tourId)
          .then(
            () => {},
            error => console.error('❌ Failed to update room finish time:', error)
          );
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
      return room;
    } catch (error) {
      console.error('❌ Guide connection error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        room: null,
        localParticipant: null,
        remoteParticipants: [],
      }));
      throw error;
    }
  }, [getToken, tourId]);

  const disconnect = useCallback(async () => {
    try {
      if (state.room) {
        await state.room.disconnect();
        setState({
          isConnected: false,
          room: null,
          localParticipant: null,
          remoteParticipants: [],
          isMicrophoneEnabled: false,
        });
      }
    } catch (error) {
      console.error('Error disconnecting from LiveKit room:', error);
      throw error;
    }
  }, [state.room]);

  // Handle app state changes
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' && state.isConnected) {
      console.log('📱 Guide app to background, disconnecting');
      await disconnect();
    } else if (nextAppState === 'active' && state.isMicrophoneEnabled) {
      console.log('📱 Guide app to foreground, reconnecting');
      await connect();
    }
  }, [state.isConnected, state.isMicrophoneEnabled, connect, disconnect]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio().catch(console.error);
      disconnect();
    };
  }, [disconnect, cleanupAudio]);

  return {
    ...state,
    connect,
    disconnect,
    toggleMicrophone,
  };
}; 