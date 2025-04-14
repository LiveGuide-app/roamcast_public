import { Room, RoomEvent, RoomOptions, RemoteParticipant, LocalParticipant, setLogLevel, LogLevel } from 'livekit-client';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getDeviceId } from '@/services/device';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';
import appLogger from '@/utils/appLogger';

// Set LiveKit logging to warnings and errors only
setLogLevel(LogLevel.warn);

interface LiveKitState {
  isConnected: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isMicrophoneEnabled: boolean;
}

export const useLiveKit = (tourId: string | null | undefined, role: 'guide' | 'listener' = 'guide') => {
  const { user } = useAuth();
  const [state, setState] = useState<LiveKitState>({
    isConnected: false,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
    isMicrophoneEnabled: false,
  });

  // Add effect to handle tourId changes
  useEffect(() => {
    if (tourId && !state.isConnected) {
      connectToRoom();
    }
  }, [tourId]);

  const getLiveKitToken = useCallback(async () => {
    try {
      if (!tourId) {
        throw new Error('Tour ID is required');
      }

      let deviceId;
      if (role === 'listener') {
        deviceId = await getDeviceId();
      }

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { 
          tourId, 
          role,
          deviceId,
          metadata: {
            name: user?.email || role,
            userId: user?.id
          }
        },
      });

      if (error) {
        throw new Error(`Failed to get LiveKit token: ${error.message}`);
      }
      return data.token;
    } catch (error) {
      appLogger.logError('Error getting LiveKit token:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [tourId, user?.id, user?.email, role]);

  const connectToRoom = useCallback(async () => {
    try {
      if (!tourId) {
        return;
      }

      const token = await getLiveKitToken();
      const wsUrl = EXPO_PUBLIC_LIVEKIT_WS_URL;

      if (!wsUrl) {
        throw new Error('LiveKit WebSocket URL not configured');
      }

      // Create room instance
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

      // Connect to room
      await room.connect(wsUrl, token);
    } catch (error) {
      appLogger.logError('Error connecting to LiveKit room:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [tourId, getLiveKitToken]);

  const disconnectFromRoom = useCallback(async () => {
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
      appLogger.logError('Error disconnecting from LiveKit room:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [state.room]);

  const toggleMicrophone = useCallback(async (enabled: boolean) => {
    try {
      if (state.room?.localParticipant) {
        await state.room.localParticipant.setMicrophoneEnabled(enabled);
        setState(prev => ({
          ...prev,
          isMicrophoneEnabled: enabled,
        }));
      }
    } catch (error) {
      appLogger.logError('Error toggling microphone:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [state.room?.localParticipant]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromRoom();
    };
  }, [disconnectFromRoom]);

  return {
    ...state,
    connectToRoom,
    disconnectFromRoom,
    toggleMicrophone,
  };
}; 