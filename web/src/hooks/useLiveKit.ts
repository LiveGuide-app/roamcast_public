import { useState, useEffect, useCallback } from 'react';
import { LiveKitService } from '@/services/livekit';

export function useLiveKit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [liveKitService, setLiveKitService] = useState<LiveKitService | null>(null);

  // Initialize LiveKit service
  useEffect(() => {
    const service = new LiveKitService();
    setLiveKitService(service);

    // Cleanup on unmount
    return () => {
      service.disconnect();
    };
  }, []);

  // Connect to a tour
  const connectToTour = useCallback(async (tourId: string) => {
    if (!liveKitService) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      await liveKitService.connect(tourId);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect to tour'));
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [liveKitService]);

  // Disconnect from the tour
  const disconnectFromTour = useCallback(() => {
    if (!liveKitService) return;
    
    liveKitService.disconnect();
    setIsConnected(false);
  }, [liveKitService]);

  return {
    isConnected,
    isConnecting,
    error,
    connectToTour,
    disconnectFromTour,
  };
} 