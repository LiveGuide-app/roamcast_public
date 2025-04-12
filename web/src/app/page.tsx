'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useLiveKit } from '@/hooks/useLiveKit';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getTourByCode, createTourParticipant, updateParticipantLeaveTime, submitTourRating, verifyTourParticipant } from '@/services/tour';
import { TourActiveScreen } from '@/components/TourActiveScreen';
import { TourPendingScreen } from '@/components/TourPendingScreen';
import { TourCompletedScreen } from '@/components/TourCompletedScreen';
import { Tour } from '@/services/tour';
import { supabase } from '@/lib/supabase';
import { DeviceIdService } from '@/services/deviceId';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export default function Home() {
  const [tourCode, setTourCode] = useState('');
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const { 
    isConnected, 
    isConnecting, 
    error, 
    isMuted,
    connectToTour, 
    disconnectFromTour,
    toggleMute
  } = useLiveKit();
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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
          setDismissedError("You don't have access to this completed tour.");
          return;
        }
        setCurrentTour(tour);
        return;
      }

      // Only create participant for non-completed tours
      await createTourParticipant(tour.id, deviceId);
      
      setCurrentTour(tour);

      // Only connect to LiveKit if the tour is active
      if (tour.status === 'active') {
        await connectToTour(tour.id);
      }
    } catch (error) {
      setDismissedError(error instanceof Error ? error.message : 'Failed to join tour');
    } finally {
      setIsLoading(false);
    }
  }, [tourCode, setCurrentTour, setDismissedError, setIsLoading, connectToTour]);

  // Subscribe to tour changes when a tour is loaded
  useEffect(() => {
    // Skip this effect during SSR
    if (typeof window === 'undefined') return;
    
    if (!currentTour) return;

    // Subscribe to changes for this specific tour
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

          // Handle tour status changes
          if (updatedTour.status !== currentTour.status) {
            // If tour is no longer active
            if (updatedTour.status !== 'active' && isConnected) {
              console.log('Tour is no longer active, disconnecting');
              disconnectFromTour();
            }
            // If tour becomes active
            else if (updatedTour.status === 'active' && !isConnected) {
              console.log('Tour became active, connecting after delay');
              // Add a small delay to ensure clean state
              await new Promise(resolve => setTimeout(resolve, 500));
              if (!isConnected) { // Double check we still want to connect
                connectToTour(updatedTour.id);
              }
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when tour changes
    return () => {
      subscription.unsubscribe();
    };
  }, [currentTour, isConnected, connectToTour, disconnectFromTour, isDisconnecting]);

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

  // Reset disconnecting state when connection state changes
  useEffect(() => {
    if (!isConnected) {
      setIsDisconnecting(false);
    }
  }, [isConnected]);

  return (
    <main className="min-h-screen bg-white py-8 px-4">
      {!currentTour ? (
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-col items-center mb-6">
            <Image 
              src="/icon-512x512.png" 
              alt="Roamcast Logo" 
              width={96}
              height={96}
              className="mb-4 rounded-lg"
            />
            <h1 className="text-2xl font-bold text-center text-gray-900">
              Welcome to Your Roamcast Tour
            </h1>
          </div>

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
          
          {isConnecting || isLoading ? (
            <div className="py-8 text-center">
              <LoadingSpinner size="large" className="mb-4" />
              <p className="text-gray-600">Connecting to tour...</p>
            </div>
          ) : (
            <form onSubmit={handleJoinTour} className="space-y-4">
              <div>
                <label htmlFor="tourCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Tour Code
                </label>
                <input
                  type="text"
                  id="tourCode"
                  value={tourCode}
                  onChange={(e) => setTourCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00615F] focus:border-transparent"
                  placeholder="Enter code"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!tourCode.trim() || isLoading}
                className="w-full py-2 px-4 bg-[#00615F] text-white rounded-md hover:bg-[#004140] focus:outline-none focus:ring-2 focus:ring-[#00615F] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Tour
              </button>
            </form>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <h2 className="font-semibold mb-2">Instructions:</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Enter your tour code above</li>
              <li>Click &quot;Join Tour&quot; to connect</li>
              <li>Keep this page open to continue listening</li>
              <li>Audio will play in the background</li>
            </ul>
          </div>
        </div>
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
          
          {isConnecting || isLoading ? (
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
                  isMuted={isMuted}
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
      
      <AudioPlayer 
        isConnected={isConnected} 
        onDisconnect={disconnectFromTour}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
    </main>
  );
}
