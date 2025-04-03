import { useState, useEffect, useCallback } from 'react';
import { Tour, getTourByCode, updateParticipantLeaveTime, submitTourRating, TourError, TourErrorCode } from '../services/tour';
import { getDeviceId } from '../services/device';
import { useGuestLiveKit } from './useGuestLiveKit';
import { supabase } from '@/lib/supabase';
import { Room } from 'livekit-client';

export type UseTourManagementReturn = {
  tour: Tour | null;
  isLoading: boolean;
  error: TourError | null;
  participantCount: number;
  isConnected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onLeaveTour: () => Promise<void>;
  onRatingSubmit: (rating: number) => Promise<void>;
};

export const useTourManagement = (code: string): UseTourManagementReturn => {
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TourError | null>(null);
  const [tourParticipantId, setTourParticipantId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const { 
    isConnected, 
    connect, 
    disconnect, 
    remoteParticipants 
  } = useGuestLiveKit(tour?.id || '');

  // Calculate participant count from remote participants
  const participantCount = remoteParticipants.length;

  const fetchTour = useCallback(async () => {
    try {
      if (!code) {
        throw new TourError('Tour code is required', TourErrorCode.NOT_FOUND);
      }
      const tourData = await getTourByCode(code);
      setTour(tourData);

      // Get the tour participant ID
      const deviceId = await getDeviceId();
      console.log('Fetching tour participant with:', { tourId: tourData.id, deviceId });
      
      const { data: participant, error: participantError } = await supabase
        .from('tour_participants')
        .select('id')
        .eq('tour_id', tourData.id)
        .eq('device_id', deviceId)
        .single();

      if (participantError) {
        if (participantError.code === 'PGRST116') {
          throw new TourError("You don't have access to this tour", TourErrorCode.UNAUTHORIZED);
        }
        console.error('Error fetching tour participant:', participantError);
        throw new TourError('Unable to verify tour participation', TourErrorCode.NETWORK_ERROR);
      }

      console.log('Found tour participant:', participant);
      if (participant) {
        setTourParticipantId(participant.id);
        // Update tour with participant_id
        setTour(prev => prev ? { ...prev, participant_id: participant.id } : null);
      } else {
        console.error('No tour participant found for:', { tourId: tourData.id, deviceId });
        throw new TourError("You don't have access to this tour", TourErrorCode.UNAUTHORIZED);
      }
    } catch (error) {
      if (error instanceof TourError) {
        setError(error);
      } else {
        setError(new TourError('Unable to load tour', TourErrorCode.NETWORK_ERROR));
      }
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  // Set up real-time subscription for tour updates
  useEffect(() => {
    let subscription: any;

    async function setupSubscription() {
      if (!tour?.id) return;

      subscription = supabase
        .channel(`tour-${tour.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tours',
            filter: `id=eq.${tour.id}`,
          },
          async (payload) => {
            const updatedTour = payload.new as Tour;
            setTour(updatedTour);

            // Only connect if we're not already connected and tour is active
            if (updatedTour.status === 'active' && updatedTour.id && !isConnected) {
              console.log('Tour became active, connecting to LiveKit');
              await connect();
            } else if (updatedTour.status !== 'active' && isConnected) {
              // Only disconnect if we're currently connected
              console.log('Tour no longer active, disconnecting');
              await disconnect();
            }
          }
        )
        .subscribe();

      // If tour is already active and we're not connected, connect immediately
      if (tour.status === 'active' && tour.id && !isConnected) {
        console.log('Tour is already active, connecting to LiveKit');
        await connect();
      }
    }

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      disconnect();
    };
  }, [tour?.id, connect, disconnect, isConnected]);

  // Initial tour fetch
  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const onToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const onLeaveTour = useCallback(async () => {
    if (!tour) return;
    
    try {
      await disconnect();
      const deviceId = await getDeviceId();
      await updateParticipantLeaveTime(tour.id, deviceId);
    } catch (error) {
      if (error instanceof TourError) {
        setError(error);
      } else {
        setError(new TourError('Failed to leave tour', TourErrorCode.NETWORK_ERROR));
      }
      throw error;
    }
  }, [tour, disconnect]);

  const onRatingSubmit = useCallback(async (rating: number) => {
    if (!tour) return;
    
    try {
      const deviceId = await getDeviceId();
      await submitTourRating(tour.id, deviceId, rating);
    } catch (error) {
      if (error instanceof TourError) {
        setError(error);
      } else {
        setError(new TourError('Failed to submit rating', TourErrorCode.NETWORK_ERROR));
      }
      throw error;
    }
  }, [tour]);

  return {
    tour,
    isLoading,
    error,
    participantCount,
    isConnected,
    isMuted,
    onToggleMute,
    onLeaveTour,
    onRatingSubmit,
  };
}; 