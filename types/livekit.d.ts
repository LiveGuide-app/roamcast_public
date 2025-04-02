import { Room, LocalParticipant, RemoteParticipant, LocalTrack } from '@livekit/react-native';
import { EXPO_PUBLIC_LIVEKIT_WS_URL } from '@env';

export interface LiveKitState {
  isConnected: boolean;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isMicrophoneEnabled: boolean;
}

export interface AudioTrackState {
  isEnabled: boolean;
  isMuted: boolean;
  track: LocalTrack | null;
}

// Room name format type
export type RoomName = `tour-${string}`;

// Participant identity types
export type GuideIdentity = `guide-${string}`;
// Listener identity is the device UUID from device.ts
export type ListenerIdentity = string; // This will be the UUID from getDeviceId()

// WebSocket URL type from environment variables
export type LiveKitWebSocketUrl = typeof EXPO_PUBLIC_LIVEKIT_WS_URL; 