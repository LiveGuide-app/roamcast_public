import { Room, RoomEvent, RemoteParticipant, Track, RemoteTrackPublication, RemoteTrack } from 'livekit-client';
import { config } from '@/config';
import { generateLiveKitToken } from '@/services/supabase';
import { WebAudioSession } from '@/audio/WebAudioSession';
import appLogger from '@/utils/appLogger';

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
      appLogger.logInfo('Initializing audio session...');
      await this.audioSession.initialize();
      this.isAudioInitialized = true;
    } catch (error) {
      appLogger.logError('Failed to initialize audio:', error as Error);
      throw error;
    }
  }

  async connect(tourId: string): Promise<void> {
    if (this.room?.state === 'connected') {
      appLogger.logInfo('Already connected to room');
      return;
    }

    if (!this.isAudioInitialized) {
      throw new Error('Audio must be initialized before connecting');
    }

    try {
      appLogger.logInfo('Attempting to connect to tour:', { tourId });
      
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

      appLogger.logInfo('Connected to room:', { roomName: this.room.name, localParticipant: this.room.localParticipant.identity });
      
      // After connecting, simulate a mute/unmute cycle to kickstart audio
      setTimeout(() => {
        if (this.room) {
          appLogger.logInfo('Simulating mute/unmute cycle to kickstart audio...');
          
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
                    el.play().catch(e => appLogger.logError('Could not auto-play audio:', e));
                  });
                }
              });
            });
          }, 100);
        }
      }, 500); // Wait 500ms after connection before simulating mute/unmute
    } catch (error) {
      appLogger.logError('Failed to connect to LiveKit room:', error as Error);
      this.cleanup();
      throw error;
    }
  }

  private setupRoomEvents(): void {
    if (!this.room) return;

    this.room
      .on(RoomEvent.Connected, () => {
        appLogger.logInfo('Connected to room');
        appLogger.logInfo('Remote participants:', { 
          participants: Array.from(this.room!.remoteParticipants.values()).map(p => p.identity) 
        });
        
        // Handle existing participants
        this.room!.remoteParticipants.forEach(participant => {
          this.handleParticipantConnected(participant);
        });
      })
      .on(RoomEvent.Disconnected, () => {
        appLogger.logInfo('Disconnected from room');
        this.cleanup();
      })
      .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        appLogger.logInfo('Participant connected:', { participantId: participant.identity });
        this.handleParticipantConnected(participant);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        appLogger.logInfo('Participant disconnected:', { participantId: participant.identity });
      })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        appLogger.logInfo('Track subscribed:', { 
          kind: track.kind, 
          participantId: participant.identity 
        });
        this.attachTrack(track, participant);
        // Set initial enabled state based on mute status
        if (track.kind === Track.Kind.Audio) {
          track.setMuted(this.isMuted);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        appLogger.logInfo('Track unsubscribed:', { 
          kind: track.kind, 
          participantId: participant.identity 
        });
      });
  }

  private handleParticipantConnected(participant: RemoteParticipant): void {
    appLogger.logInfo('Setting up participant:', { participantId: participant.identity });
    
    // Log existing tracks
    participant.getTrackPublications().forEach(publication => {
      appLogger.logInfo('Found track:', { 
        kind: publication.kind, 
        trackName: publication.trackName, 
        isMuted: this.isMuted 
      });
    });

    // Handle new tracks
    participant
      .on(RoomEvent.TrackPublished, (publication) => {
        appLogger.logInfo('Track published:', { 
          kind: publication.kind, 
          trackName: publication.trackName 
        });
      })
      .on(RoomEvent.TrackUnpublished, (publication) => {
        appLogger.logInfo('Track unpublished:', { 
          kind: publication.kind, 
          trackName: publication.trackName 
        });
      })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        appLogger.logInfo('Track subscribed:', { kind: track.kind });
        this.attachTrack(track, participant);
        // Set initial enabled state based on mute status
        if (track.kind === Track.Kind.Audio) {
          track.setMuted(this.isMuted);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        appLogger.logInfo('Track unsubscribed:', { kind: track.kind });
      });
  }

  private async attachTrack(track: RemoteTrack, participant: RemoteParticipant): Promise<void> {
    if (track.kind !== Track.Kind.Audio) return;

    appLogger.logInfo('Attaching audio track from:', { participantId: participant.identity });
    
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
      appLogger.logInfo('Audio playback started successfully');
    } catch (e) {
      appLogger.logWarning('Initial auto-play failed, will retry:', { error: e });
      
      // Set up a persistent retry mechanism
      const retryPlay = (attempt = 0) => {
        if (attempt > 5) return; // Give up after several attempts
        
        appLogger.logInfo(`Retry attempt ${attempt + 1} to play audio`);
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
    appLogger.logInfo('Toggling mute:', { isMuted: this.isMuted });
    
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
      appLogger.logInfo('Disconnecting from room');
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