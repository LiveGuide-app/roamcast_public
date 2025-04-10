import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import { config } from '@/config';
import { generateLiveKitToken } from '@/services/supabase';

export class LiveKitService {
  private room: Room | null = null;
  private audioContext: AudioContext | null = null;
  private mediaSession: MediaSession | null = null;

  constructor() {
    // Initialize audio context
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async connect(tourCode: string): Promise<void> {
    try {
      // Create a new room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up room events
      this.setupRoomEvents();

      // Get token from Supabase
      const token = await generateLiveKitToken(tourCode, 'listener');

      // Connect to the room
      await this.room.connect(config.livekit.wsUrl, token);
      
      // Set up media session for background playback
      this.setupMediaSession();
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      throw error;
    }
  }

  private setupRoomEvents(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to room');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      this.cleanup();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
    });
  }

  private setupMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    // Set up media session metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Roamcast Tour',
      artist: 'Live Tour',
      album: 'Roamcast',
    });

    // Set up media controls
    navigator.mediaSession.setActionHandler('play', () => {
      this.resumeAudio();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.pauseAudio();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.disconnect();
    });
  }

  private resumeAudio(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private pauseAudio(): void {
    if (this.audioContext?.state === 'running') {
      this.audioContext.suspend();
    }
  }

  disconnect(): void {
    if (this.room) {
      this.room.disconnect();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.room = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
} 