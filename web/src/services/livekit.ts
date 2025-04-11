import { Room, RoomEvent, RemoteParticipant, Track, RemoteTrackPublication, RemoteTrack } from 'livekit-client';
import { config } from '@/config';
import { generateLiveKitToken } from '@/services/supabase';
import { WebAudioSession } from '@/audio/WebAudioSession';

export class LiveKitService {
  private room: Room | null = null;
  private audioSession: WebAudioSession;
  private isMuted: boolean = false;

  constructor() {
    this.audioSession = new WebAudioSession();
  }

  async connect(tourId: string): Promise<void> {
    if (this.room?.state === 'connected') {
      console.log('Already connected to room');
      return;
    }

    try {
      // Initialize audio session
      await this.audioSession.initialize();

      console.log('Attempting to connect to tour:', tourId);
      
      // Create a new room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up room events
      this.setupRoomEvents();

      // Get token from Supabase
      const token = await generateLiveKitToken(tourId, 'listener');

      // Connect to the room with autoSubscribe enabled
      await this.room.connect(config.livekit.wsUrl, token, {
        autoSubscribe: true,
      });

      console.log('Connected to room:', this.room.name);
      console.log('Local participant:', this.room.localParticipant.identity);
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      this.cleanup();
      throw error;
    }
  }

  private setupRoomEvents(): void {
    if (!this.room) return;

    this.room
      .on(RoomEvent.Connected, () => {
        console.log('Connected to room');
        console.log('Remote participants:', Array.from(this.room!.remoteParticipants.values()).map(p => p.identity));
        
        // Handle existing participants
        this.room!.remoteParticipants.forEach(participant => {
          this.handleParticipantConnected(participant);
        });
      })
      .on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        this.cleanup();
      })
      .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        this.handleParticipantConnected(participant);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
      })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        this.attachTrack(track, participant);
        // Set initial enabled state based on mute status
        if (track.kind === Track.Kind.Audio) {
          track.setMuted(this.isMuted);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      });
  }

  private handleParticipantConnected(participant: RemoteParticipant): void {
    console.log('Setting up participant:', participant.identity);
    
    // Log existing tracks
    participant.getTrackPublications().forEach(publication => {
      console.log('Found track:', publication.kind, publication.trackName, 'isMuted:', this.isMuted);
    });

    // Handle new tracks
    participant
      .on(RoomEvent.TrackPublished, (publication) => {
        console.log('Track published:', publication.kind, publication.trackName);
      })
      .on(RoomEvent.TrackUnpublished, (publication) => {
        console.log('Track unpublished:', publication.kind, publication.trackName);
      })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        console.log('Track subscribed:', track.kind);
        this.attachTrack(track, participant);
        // Set initial enabled state based on mute status
        if (track.kind === Track.Kind.Audio) {
          track.setMuted(this.isMuted);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log('Track unsubscribed:', track.kind);
      });
  }

  private attachTrack(track: RemoteTrack, participant: RemoteParticipant): void {
    if (track.kind !== Track.Kind.Audio) return;

    console.log('Attaching audio track from:', participant.identity);
    const audioElement = track.attach();
    audioElement.style.display = 'none';
    audioElement.muted = this.isMuted;  // Set initial mute state
    document.body.appendChild(audioElement);
  }

  async toggleMute(): Promise<void> {
    if (!this.room) return;

    this.isMuted = !this.isMuted;
    console.log('Toggling mute:', this.isMuted);
    
    // Set mute state on all subscribed tracks
    this.room.remoteParticipants.forEach(participant => {
      const audioTracks = Array.from(participant.getTrackPublications().values())
        .filter(pub => pub.kind === Track.Kind.Audio);
      
      audioTracks.forEach(publication => {
        if (publication.track && publication.track.mediaStreamTrack) {
          publication.track.mediaStreamTrack.enabled = !this.isMuted;
        }
      });
    });
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  disconnect(): void {
    if (this.room) {
      console.log('Disconnecting from room');
      // Remove event listeners before disconnecting
      this.room.removeAllListeners();
      this.room.disconnect();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.room) {
      // Remove any attached audio elements
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(el => {
        // Stop the audio track before removing
        if (el.srcObject) {
          const tracks = (el.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
        }
        el.remove();
      });
      this.room = null;
    }
  }

  isConnected(): boolean {
    return this.room?.state === 'connected';
  }
}