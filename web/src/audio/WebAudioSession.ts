import { config } from '@/config';

// Extend Window interface using declaration merging
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export class WebAudioSession {
  private isIOS: boolean;
  private isSafari: boolean;

  constructor() {
    // Detect platform
    if (typeof window !== 'undefined') {
      this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    } else {
      this.isIOS = false;
      this.isSafari = false;
    }
  }

  /**
   * Initialize audio with platform-specific optimizations
   */
  async initialize(): Promise<void> {
    // iOS Safari requires user interaction to start audio
    if (this.isIOS && this.isSafari) {
      await this.initializeIOSAudio();
    }

    // Set up media session for background playback
    this.setupMediaSession();

    // Handle visibility changes
    this.setupVisibilityHandler();
  }

  /**
   * Initialize audio specifically for iOS Safari
   */
  private async initializeIOSAudio(): Promise<void> {
    // Create a silent audio context to unlock audio
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.001);
    await audioContext.close();
  }

  /**
   * Set up media session for background playback
   */
  private setupMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    // Set up media session metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: config.app.name,
      artist: 'Live Tour',
      album: 'Roamcast',
    });
  }

  /**
   * Handle visibility changes to ensure audio continues in background
   */
  private setupVisibilityHandler(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, ensure audio continues
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }
    });
  }

  /**
   * Check if the current browser is iOS Safari
   */
  isIOSSafari(): boolean {
    return this.isIOS && this.isSafari;
  }
} 