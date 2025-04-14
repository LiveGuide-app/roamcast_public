import { useState, useEffect, useCallback } from 'react';
import { Tour, getTourByCode, updateParticipantLeaveTime, submitTourRating, TourError, TourErrorCode } from '../services/tour';
import { getDeviceId } from '../services/device';
import { useGuestLiveKit } from './useGuestLiveKit';
import { supabase } from '@/lib/supabase';
import { Room } from 'livekit-client';
import appLogger from '@/utils/appLogger';

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
  guideInfo: { name: string; recommendationsLink: string | null } | null;
  hasRated: boolean;
};

export const useTourManagement = (code: string): UseTourManagementReturn => {
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TourError | null>(null);
  const [tourParticipantId, setTourParticipantId] = useState<string | null>(null);
  const [hasLeft, setHasLeft] = useState(false);
  const [guideInfo, setGuideInfo] = useState<{ name: string; recommendationsLink: string | null } | null>(null);
  const [hasRated, setHasRated] = useState(false);

  const { 
    isConnected, 
    connect, 
    disconnect, 
    remoteParticipants,
    isMuted,
    toggleMute
  } = useGuestLiveKit(tour?.id || '', tour?.status === 'active', hasLeft);

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
      appLogger.logInfo('Fetching tour participant with:', { tourId: tourData.id, deviceId });
      
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
        appLogger.logError('Error fetching tour participant:', participantError instanceof Error ? participantError : new Error(String(participantError)));
        throw new TourError('Unable to verify tour participation', TourErrorCode.NETWORK_ERROR);
      }

      appLogger.logInfo('Found tour participant:', participant);
      if (participant) {
        setTourParticipantId(participant.id);
        // Update tour with participant_id
        setTour(prev => prev ? { ...prev, participant_id: participant.id } : null);
      } else {
        appLogger.logError('No tour participant found for tour:', new Error("No participant found"), { tourId: tourData.id, deviceId });
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
          }
        )
        .subscribe();
    }

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [tour?.id]);

  // Initial tour fetch
  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const onLeaveTour = useCallback(async () => {
    if (!tour) return;
    
    try {
      setHasLeft(true); // Set hasLeft BEFORE disconnecting
      await disconnect();
      const deviceId = await getDeviceId();
      await updateParticipantLeaveTime(tour.id, deviceId);
    } catch (error) {
      setHasLeft(false); // Reset hasLeft if there was an error
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
      
      // After successful rating submission, fetch guide info
      const { data: tourData } = await supabase
        .from('tours')
        .select('guide_id')
        .eq('id', tour.id)
        .single();

      if (tourData?.guide_id) {
        const { data: guide } = await supabase
          .from('users')
          .select('full_name, recommendations_link')
          .eq('id', tourData.guide_id)
          .single();

        if (guide) {
          setGuideInfo({
            name: guide.full_name,
            recommendationsLink: guide.recommendations_link
          });
          setHasRated(true);
        }
      }
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
    onToggleMute: toggleMute,
    onLeaveTour,
    onRatingSubmit,
    guideInfo,
    hasRated,
  };
}; 