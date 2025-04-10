import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveKitService } from '@/services/livekit';

export function useLiveKit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [liveKitService] = useState(() => new LiveKitService());
  const isDisconnectingRef = useRef(false);

  // Connect to a tour
  const connectToTour = useCallback(async (tourId: string) => {
    if (!liveKitService || isConnecting || isDisconnectingRef.current) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      await liveKitService.connect(tourId);
      setIsConnected(liveKitService.isConnected());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect to tour'));
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [liveKitService, isConnecting]);

  // Disconnect from the tour
  const disconnectFromTour = useCallback(() => {
    if (!liveKitService || isDisconnectingRef.current) return;
    
    isDisconnectingRef.current = true;
    console.log('Starting disconnect from tour');
    liveKitService.disconnect();
    setIsConnected(false);
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
          console.log('Page hidden, keeping connection alive');
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
        console.log('Cleanup: disconnecting from tour');
        disconnectFromTour();
      }
    };
  }, [isConnected, disconnectFromTour]);

  return {
    isConnected,
    isConnecting,
    error,
    isMuted,
    connectToTour,
    disconnectFromTour,
    toggleMute
  };
} 