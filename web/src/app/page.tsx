'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getTourByCode, createTourParticipant, updateParticipantLeaveTime, submitTourRating, verifyTourParticipant } from '@/services/tour';
import { TourActiveScreen } from '@/components/TourActiveScreen';
import { TourPendingScreen } from '@/components/TourPendingScreen';
import { TourCompletedScreen } from '@/components/TourCompletedScreen';
import { Tour } from '@/types/tour';
import { supabase } from '@/lib/supabase';
import { DeviceIdService } from '@/services/deviceId';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { JoinTourForm } from '@/components/JoinTourForm';
import appLogger from '@/utils/appLogger';
export default function Home() {
  const [tourCode, setTourCode] = useState('');
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const { 
    isConnected, 
    isConnecting, 
    error, 
    isMuted,
    isAudioReady,
    initializeAudioAndConnect,
    disconnectFromTour,
    toggleMute
  } = useLiveKit();
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const codeFromUrl = searchParams.get('code');
    
    if (codeFromUrl && !currentTour && !isLoading) {
      setTourCode(codeFromUrl.toUpperCase());
    }
  }, [currentTour, isLoading]);

  const handleJoinTour = useCallback(async (e: React.FormEvent | null) => {
    if (e) e.preventDefault();
    if (!tourCode.trim()) return;
    
    setDismissedError(null);
    setIsLoading(true);

    try {
      const tour = await getTourByCode(tourCode);
      
      if (tour.status === 'cancelled') {
        setDismissedError('This tour has been cancelled by the guide.');
        return;
      }

      const deviceId = await DeviceIdService.getDatabaseId();

      if (tour.status === 'completed') {
        // Verify participant access for completed tours
        const hasAccess = await verifyTourParticipant(tour.id, deviceId);
        if (!hasAccess) {
          setDismissedError("You don't have access to this tour.");
          return;
        }
        setCurrentTour(tour);
        return;
      }

      // Only create participant for non-completed tours
      await createTourParticipant(tour.id, deviceId);
      setCurrentTour(tour);
    } catch (error) {
      setDismissedError(error instanceof Error ? error.message : 'Failed to join tour');
    } finally {
      setIsLoading(false);
    }
  }, [tourCode]);

  // Subscribe to tour changes when a tour is loaded
  useEffect(() => {
    if (typeof window === 'undefined' || !currentTour) return;

    const subscription = supabase
      .channel(`tour-${currentTour.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tours',
          filter: `id=eq.${currentTour.id}`,
        },
        async (payload: RealtimePostgresChangesPayload<{ new: Tour; old: Tour }>) => {
          const updatedTour = payload.new as Tour;
          setCurrentTour(updatedTour);

          // If tour becomes inactive while we're connected, disconnect
          if (updatedTour.status !== 'active' && isConnected) {
            appLogger.logInfo('Tour is no longer active, disconnecting');
            disconnectFromTour();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentTour, isConnected, disconnectFromTour]);

  const handleStartAudio = useCallback(async () => {
    if (!currentTour) return;
    try {
      await initializeAudioAndConnect(currentTour.id);
    } catch (error) {
      appLogger.logError('Failed to start audio:', error as Error);
      setDismissedError('Failed to start audio. Please try again.');
    }
  }, [currentTour, initializeAudioAndConnect]);

  const handleDismissError = () => {
    setDismissedError(error?.message || null);
  };

  const handleLeaveTour = async () => {
    if (currentTour) {
      const deviceId = await DeviceIdService.getDatabaseId();
      await updateParticipantLeaveTime(currentTour.id, deviceId);
    }
    setCurrentTour(null);
    setTourCode('');
    disconnectFromTour();
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!currentTour) return;
    const deviceId = await DeviceIdService.getDatabaseId();
    await submitTourRating(currentTour.id, deviceId, rating);
  };

  const showError = error && error.message !== dismissedError;

  return (
    <main className="min-h-screen bg-gray-50">
      {!currentTour ? (
        <JoinTourForm
          tourCode={tourCode}
          setTourCode={setTourCode}
          onSubmit={handleJoinTour}
          isLoading={isLoading}
          error={dismissedError}
          onDismissError={() => setDismissedError(null)}
        />
      ) : (
        <>
          {showError && (
            <ErrorMessage 
              message={error.message} 
              onDismiss={handleDismissError} 
            />
          )}
          
          {dismissedError && (
            <ErrorMessage 
              message={dismissedError} 
              onDismiss={() => setDismissedError(null)} 
            />
          )}
          
          {isLoading ? (
            <div className="py-8 text-center">
              <LoadingSpinner size="large" className="mb-4" />
              <p className="text-gray-600">Connecting to tour...</p>
            </div>
          ) : (
            <>
              {currentTour.status === 'active' && (
                <TourActiveScreen
                  tour={currentTour}
                  isConnected={isConnected}
                  isAudioReady={isAudioReady}
                  isMuted={isMuted}
                  isConnecting={isConnecting}
                  onStartAudio={handleStartAudio}
                  onToggleMute={toggleMute}
                  onLeaveTour={handleLeaveTour}
                />
              )}
              {currentTour.status === 'pending' && (
                <TourPendingScreen
                  tour={currentTour}
                  onLeaveTour={handleLeaveTour}
                />
              )}
              {currentTour.status === 'completed' && (
                <TourCompletedScreen
                  tour={currentTour}
                  onLeaveTour={handleLeaveTour}
                  onRatingSubmit={handleRatingSubmit}
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
