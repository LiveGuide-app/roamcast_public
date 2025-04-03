import { Room, RoomEvent, RemoteParticipant, LocalParticipant, setLogLevel, LogLevel } from 'livekit-client';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getDeviceId } from '@/services/device';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';

// Enable LiveKit debug logging
setLogLevel(LogLevel.debug);

interface GuestLiveKitState {
  isConnected: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
}

export const useGuestLiveKit = (tourId: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<GuestLiveKitState>({
    isConnected: false,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
  });

  const getToken = useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
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
      console.error('Error getting LiveKit token:', error);
      throw error;
    }
  }, [tourId, user?.id, user?.email]);

  const connect = useCallback(async () => {
    try {
      const token = await getToken();
      const wsUrl = EXPO_PUBLIC_LIVEKIT_WS_URL;

      console.log('Guest attempting to connect to LiveKit');
      console.log('WebSocket URL:', wsUrl);

      if (!wsUrl) {
        throw new Error('LiveKit WebSocket URL not configured');
      }

      console.log('Token obtained successfully');

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('Guest connected to LiveKit room');
        setState(prev => ({
          ...prev,
          isConnected: true,
          room,
          localParticipant: room.localParticipant,
          remoteParticipants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Guest disconnected from LiveKit room');
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
        });
      }
    } catch (error) {
      console.error('Error disconnecting from LiveKit room:', error);
      throw error;
    }
  }, [state.room]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}; 