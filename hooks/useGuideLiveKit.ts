import { Room, RoomEvent, RemoteParticipant, LocalParticipant, RoomOptions, setLogLevel, LogLevel } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';

// Set LiveKit logging to warnings and errors only
setLogLevel(LogLevel.warn);

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
    } catch (error) {
      console.error('Failed to stop audio session:', error);
      throw error;
    }
  }, []);

  const getToken = useCallback(async () => {
    try {
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
      console.error('Error getting LiveKit token:', error);
      throw error;
    }
  }, [tourId, user?.id, user?.email]);

  const connect = useCallback(async () => {
    try {
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
        setState(prev => ({
          ...prev,
          isConnected: true,
          room,
          localParticipant: room.localParticipant,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
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
      return room;
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
      throw error;
    }
  }, [getToken]);

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

  const toggleMicrophone = useCallback(async (enabled: boolean) => {
    try {
      if (state.room?.localParticipant) {
        if (enabled) {
          await initializeAudio();
        }
        
        await state.room.localParticipant.setMicrophoneEnabled(enabled);
        
        if (!enabled) {
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