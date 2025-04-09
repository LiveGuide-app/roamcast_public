import { useState, useEffect } from 'react';
import { Tour, getTourAverageRating } from '@/services/tour';
import { supabase } from '@/lib/supabase';

interface TourStatistics {
  totalGuests: number;
  rating: number | null;
  totalReviews: number;
  earnings: number;
  totalTips: number;
  duration: string | null;
}

export const useTourStatistics = (tour: Tour | null, participantCount?: number) => {
  const [statistics, setStatistics] = useState<TourStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatistics = async () => {
    if (!tour || tour.status !== 'completed') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate duration in MM:SS format
      const startTime = tour.room_started_at ? new Date(tour.room_started_at).getTime() : null;
      const endTime = tour.room_finished_at ? new Date(tour.room_finished_at).getTime() : null;
      const duration = startTime && endTime ? 
        formatDuration(endTime - startTime) : null;

      // Get feedback statistics using getTourAverageRating
      const { averageRating, totalReviews } = await getTourAverageRating(tour.id);

      // Fetch latest tour data to get updated tips
      const { data: latestTour, error: tourError } = await supabase
        .from('tours')
        .select(`
          *,
          tour_participants(
            id,
            tour_tips(
              amount,
              status
            )
          )
        `)
        .eq('id', tour.id)
        .single();

      if (tourError) throw tourError;

      // Calculate total tips and count from the latest tour data
      let totalTipsAmount = 0;
      let totalTipsCount = 0;

      latestTour.tour_participants?.forEach((participant: any) => {
        participant.tour_tips?.forEach((tip: any) => {
          if (tip.status === 'succeeded') {
            totalTipsAmount += tip.amount || 0;
            totalTipsCount += 1;
          }
        });
      });

      // Convert from cents to pounds for display
      const earningsInPounds = totalTipsAmount / 100;

      setStatistics({
        totalGuests: participantCount !== undefined ? participantCount : tour.total_participants,
        rating: averageRating,
        totalReviews: totalReviews,
        earnings: earningsInPounds,
        totalTips: totalTipsCount,
        duration
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch statistics'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();

    // Subscribe to tour tips changes
    if (tour?.id) {
      const subscription = supabase
        .channel(`tour-tips-${tour.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tour_tips',
            filter: `tour_participant_id=in.(select id from tour_participants where tour_id=eq.${tour.id})`
          },
          () => {
            // Refresh statistics when tips change
            fetchStatistics();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [tour?.id, tour?.status, participantCount]);

  // Helper function to format duration in MM:SS format
  const formatDuration = (durationMs: number): string => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return { statistics, isLoading, error };
}; 