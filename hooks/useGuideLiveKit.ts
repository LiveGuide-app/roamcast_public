import { Room, RoomEvent, RemoteParticipant, LocalParticipant, RoomOptions, setLogLevel, LogLevel } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
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
  const autoEndTimerRef = useRef<NodeJS.Timeout | null>(null);

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

        // Set up auto-end timer when connected
        if (autoEndTimerRef.current) {
          clearTimeout(autoEndTimerRef.current);
        }
        // Set new timer for 6 hours (21600000 ms)
        autoEndTimerRef.current = setTimeout(async () => {
          console.log('🕒 Auto-ending tour after 6 hours');
          try {
            // Update tour status to completed
            await supabase
              .from('tours')
              .update({ 
                status: 'completed',
                room_finished_at: new Date().toISOString()
              })
              .eq('id', tourId);
            
            // Disconnect from LiveKit
            await disconnect(true);
          } catch (error) {
            console.error('Error auto-ending tour:', error);
          }
        }, 21600000);
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

        // Clear auto-end timer when disconnected
        if (autoEndTimerRef.current) {
          clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = null;
        }
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

  const disconnect = useCallback(async (shouldCleanup: boolean = false) => {
    try {
      if (state.room) {
        await state.room.disconnect();
        if (shouldCleanup) {
          await cleanupAudio();
        }
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
  }, [state.room, cleanupAudio]);

  // Handle app state changes
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' && state.isConnected) {
      console.log('📱 Guide app to background, disconnecting (no cleanup)');
      await disconnect(false);
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
        if (enabled && !state.isMicrophoneEnabled) {
          // Only initialize audio session if it hasn't been initialized yet
          await initializeAudio();
        }
        
        // Toggle microphone state without affecting audio session
        await state.room.localParticipant.setMicrophoneEnabled(enabled);
        
        setState(prev => ({
          ...prev,
          isMicrophoneEnabled: enabled,
        }));
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      throw error;
    }
  }, [state.room?.localParticipant, state.isMicrophoneEnabled, initializeAudio]);

  // Cleanup only on unmount if we're still connected
  useEffect(() => {
    return () => {
      if (state.isConnected) {
        disconnect(false).catch(console.error);
      }
      // Clear auto-end timer on unmount
      if (autoEndTimerRef.current) {
        clearTimeout(autoEndTimerRef.current);
        autoEndTimerRef.current = null;
      }
    };
  }, [state.isConnected, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    toggleMicrophone,
  };
}; 