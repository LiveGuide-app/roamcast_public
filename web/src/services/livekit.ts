import { Room, RoomEvent, RemoteParticipant, Track, RemoteTrackPublication, RemoteTrack } from 'livekit-client';
import { config } from '@/config';
import { generateLiveKitToken } from '@/services/supabase';
import { WebAudioSession } from '@/audio/WebAudioSession';

export class LiveKitService {
  private room: Room | null = null;
  private audioSession: WebAudioSession;
  private isMuted: boolean = false;
  private isAudioInitialized: boolean = false;

  constructor() {
    this.audioSession = new WebAudioSession();
  }

  async initializeAudio(): Promise<void> {
    if (this.isAudioInitialized) return;
    
    try {
      console.log('Initializing audio session...');
      await this.audioSession.initialize();
      this.isAudioInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }

  async connect(tourId: string): Promise<void> {
    if (this.room?.state === 'connected') {
      console.log('Already connected to room');
      return;
    }

    if (!this.isAudioInitialized) {
      throw new Error('Audio must be initialized before connecting');
    }

    try {
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
      
      // After connecting, simulate a mute/unmute cycle to kickstart audio
      setTimeout(() => {
        if (this.room) {
          console.log('Simulating mute/unmute cycle to kickstart audio...');
          
          // First disable all audio tracks
          this.room.remoteParticipants.forEach(participant => {
            const audioTracks = Array.from(participant.getTrackPublications().values())
              .filter(pub => pub.kind === Track.Kind.Audio);
            
            audioTracks.forEach(publication => {
              if (publication.track && publication.track.mediaStreamTrack) {
                // Temporarily disable track
                publication.track.mediaStreamTrack.enabled = false;
              }
            });
          });
          
          // Then re-enable them after a short delay
          setTimeout(() => {
            this.room?.remoteParticipants.forEach(participant => {
              const audioTracks = Array.from(participant.getTrackPublications().values())
                .filter(pub => pub.kind === Track.Kind.Audio);
              
              audioTracks.forEach(publication => {
                if (publication.track && publication.track.mediaStreamTrack) {
                  // Re-enable track
                  publication.track.mediaStreamTrack.enabled = true;
                  
                  // Also try to play any audio elements
                  document.querySelectorAll('audio').forEach(el => {
                    el.play().catch(e => console.log('Could not auto-play audio:', e));
                  });
                }
              });
            });
          }, 100);
        }
      }, 500); // Wait 500ms after connection before simulating mute/unmute
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

  private async attachTrack(track: RemoteTrack, participant: RemoteParticipant): Promise<void> {
    if (track.kind !== Track.Kind.Audio) return;

    console.log('Attaching audio track from:', participant.identity);
    
    // Create and configure audio element
    const audioElement = track.attach() as HTMLAudioElement;
    audioElement.style.display = 'none';
    audioElement.muted = this.isMuted;  // Set initial mute state
    audioElement.autoplay = true;  // Enable autoplay for all browsers
    
    // Set additional attributes for mobile browsers
    audioElement.setAttribute('playsinline', 'true');
    audioElement.setAttribute('webkit-playsinline', 'true');
    audioElement.setAttribute('controls', 'false');
    
    // Add the element to DOM
    document.body.appendChild(audioElement);
    
    // Try to play immediately
    try {
      await audioElement.play();
      console.log('Audio playback started successfully');
    } catch (e) {
      console.warn('Initial auto-play failed, will retry:', e);
      
      // Set up a persistent retry mechanism
      const retryPlay = (attempt = 0) => {
        if (attempt > 5) return; // Give up after several attempts
        
        console.log(`Retry attempt ${attempt + 1} to play audio`);
        audioElement.play().catch(() => {
          // If play fails, try again with increasing delay
          setTimeout(() => retryPlay(attempt + 1), 200 * (attempt + 1));
        });
      };
      
      // Start retrying after a short delay
      setTimeout(() => retryPlay(), 200);
    }
    
    // Ensure the MediaStreamTrack is enabled
    if (track.mediaStreamTrack) {
      track.mediaStreamTrack.enabled = true;
    }
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
        // Use the track's enabled property to control audio
        if (publication.track && publication.track.mediaStreamTrack) {
          publication.track.mediaStreamTrack.enabled = !this.isMuted;
        }
      });
    });

    // Also update all audio HTML elements to match the mute state
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(el => {
      el.muted = this.isMuted;
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

  isAudioReady(): boolean {
    return this.isAudioInitialized;
  }
}