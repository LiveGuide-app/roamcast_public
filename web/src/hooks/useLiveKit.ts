import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveKitService } from '@/services/livekit';
import appLogger from '@/utils/appLogger';

export function useLiveKit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [liveKitService] = useState(() => new LiveKitService());
  const isDisconnectingRef = useRef(false);

  // Initialize audio and connect to tour
  const initializeAudioAndConnect = useCallback(async (tourId: string) => {
    if (!liveKitService || isConnecting || isDisconnectingRef.current) return;
    
    try {
      setIsConnecting(true);
      setError(null);

      // Initialize audio first
      await liveKitService.initializeAudio();
      setIsAudioReady(true);

      // Then connect to LiveKit
      await liveKitService.connect(tourId);
      setIsConnected(liveKitService.isConnected());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize audio and connect'));
      setIsConnected(false);
      setIsAudioReady(false);
    } finally {
      setIsConnecting(false);
    }
  }, [liveKitService, isConnecting]);

  // Disconnect from the tour
  const disconnectFromTour = useCallback(() => {
    if (!liveKitService || isDisconnectingRef.current) return;
    
    isDisconnectingRef.current = true;
    appLogger.logInfo('Starting disconnect from tour');
    liveKitService.disconnect();
    setIsConnected(false);
    setIsAudioReady(false);
  }, [liveKitService]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!liveKitService) return;
    
    await liveKitService.toggleMute();
    setIsMuted(liveKitService.getMuted());
  }, [liveKitService]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Keep the connection alive when the page is hidden
        if (isConnected) {
          appLogger.logInfo('Page hidden, keeping connection alive');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected]);

  // Reset disconnecting state when connection state changes
  useEffect(() => {
    if (!isConnected) {
      // Only reset the disconnecting state after we're fully disconnected
      setTimeout(() => {
        isDisconnectingRef.current = false;
      }, 100);
    }
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected && !isDisconnectingRef.current) {
        appLogger.logInfo('Cleanup: disconnecting from tour');
        disconnectFromTour();
      }
    };
  }, [isConnected, disconnectFromTour]);

  return {
    isConnected,
    isConnecting,
    error,
    isMuted,
    isAudioReady,
    initializeAudioAndConnect,
    disconnectFromTour,
    toggleMute
  };
} 