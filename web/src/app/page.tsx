'use client';

import { useState, useEffect } from 'react';
import { useLiveKit } from '@/hooks/useLiveKit';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getTourByCode } from '@/services/tour';
import { TourActiveScreen } from '@/components/TourActiveScreen';
import { TourPendingScreen } from '@/components/TourPendingScreen';
import { TourCompletedScreen } from '@/components/TourCompletedScreen';
import { Tour } from '@/services/tour';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [tourCode, setTourCode] = useState('');
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { isConnected, isConnecting, error, connectToTour, disconnectFromTour } = useLiveKit();
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to tour changes when a tour is loaded
  useEffect(() => {
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
        (payload) => {
          const updatedTour = payload.new as Tour;
          setCurrentTour(updatedTour);

          // If the tour becomes active, connect to LiveKit
          if (updatedTour.status === 'active' && !isConnected) {
            connectToTour(tourCode);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when tour changes
    return () => {
      subscription.unsubscribe();
    };
  }, [currentTour, isConnected, connectToTour, tourCode]);

  const handleJoinTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourCode.trim()) return;
    
    setDismissedError(null);
    setIsLoading(true);

    try {
      const tour = await getTourByCode(tourCode);
      setCurrentTour(tour);
      
      if (tour.status === 'cancelled') {
        setDismissedError('This tour has been cancelled by the guide.');
        return;
      }

      if (tour.status === 'pending') {
        return;
      }

      if (tour.status === 'completed') {
        return;
      }

      // Only connect to LiveKit if the tour is active
      if (tour.status === 'active') {
        await connectToTour(tourCode);
      }
    } catch (error) {
      setDismissedError(error instanceof Error ? error.message : 'Failed to join tour');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissError = () => {
    setDismissedError(error?.message || null);
  };

  const handleLeaveTour = () => {
    setCurrentTour(null);
    setTourCode('');
    disconnectFromTour();
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const showError = error && error.message !== dismissedError;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          Join Roamcast Tour
        </h1>
        
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
        ) : currentTour ? (
          <>
            {currentTour.status === 'active' && (
              <TourActiveScreen
                tour={currentTour}
                isConnected={isConnected}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
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
              />
            )}
          </>
        ) : (
          <form onSubmit={handleJoinTour} className="space-y-4">
            <div>
              <label 
                htmlFor="tour-code" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tour Code
              </label>
              <input
                id="tour-code"
                type="text"
                value={tourCode}
                onChange={(e) => setTourCode(e.target.value)}
                placeholder="Enter your tour code"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isConnecting || isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting || isLoading || !tourCode.trim()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Tour
            </button>
          </form>
        )}

        {!currentTour && (
          <>
            <div className="mt-6 text-sm text-gray-600">
              <h2 className="font-semibold mb-2">Instructions:</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter your tour code above</li>
                <li>Click "Join Tour" to connect</li>
                <li>Keep this page open to continue listening</li>
                <li>Audio will play in the background</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h2 className="font-semibold text-blue-800 mb-2">Platform Notes:</h2>
              <p className="text-sm text-blue-700">
                iOS: Keep Safari open to continue listening
                <br />
                Android: Audio will continue when screen is locked
              </p>
            </div>
          </>
        )}
      </div>
      
      <AudioPlayer 
        isConnected={isConnected} 
        onDisconnect={disconnectFromTour}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </main>
  );
}
