import { Room, RoomEvent, RoomOptions, RemoteParticipant, LocalParticipant, setLogLevel, LogLevel } from 'livekit-client';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getDeviceId } from '@/services/device';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';

// Enable LiveKit debug logging
setLogLevel(LogLevel.debug);

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
      console.log('Tour ID changed, attempting to connect:', tourId);
      connectToRoom();
    }
  }, [tourId]);

  const getLiveKitToken = useCallback(async () => {
    try {
      if (!tourId) {
        console.log('No tour ID available for token generation');
        throw new Error('Tour ID is required');
      }

      let deviceId;
      if (role === 'listener') {
        deviceId = await getDeviceId();
      }

      console.log('Getting LiveKit token with params:', { tourId, role, deviceId });

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
        console.error('LiveKit token error:', error);
        throw new Error(`Failed to get LiveKit token: ${error.message}`);
      }
      return data.token;
    } catch (error) {
      console.error('Error getting LiveKit token:', error);
      throw error;
    }
  }, [tourId, user?.id, user?.email, role]);

  const connectToRoom = useCallback(async () => {
    try {
      console.log('Attempting to connect with tourId:', tourId);
      console.log('WebSocket URL:', EXPO_PUBLIC_LIVEKIT_WS_URL);
      
      if (!tourId) {
        console.log('No tour ID available, skipping connection');
        return;
      }

      const token = await getLiveKitToken();
      const wsUrl = EXPO_PUBLIC_LIVEKIT_WS_URL;

      if (!wsUrl) {
        throw new Error('LiveKit WebSocket URL not configured');
      }

      console.log('Connecting to LiveKit with URL:', wsUrl);
      console.log('Token obtained successfully');

      // Create room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        setState(prev => ({
          ...prev,
          isConnected: true,
          room,
          localParticipant: room.localParticipant,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        setState(prev => ({
          ...prev,
          isConnected: false,
          room: null,
          localParticipant: null,
          remoteParticipants: [],
        }));
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        setState(prev => ({
          ...prev,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        setState(prev => ({
          ...prev,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      // Connect to room (LiveKit handles room creation/joining)
      await room.connect(wsUrl, token);
    } catch (error) {
      console.error('Error connecting to LiveKit room:', error);
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
      console.error('Error disconnecting from LiveKit room:', error);
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
      console.error('Error toggling microphone:', error);
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