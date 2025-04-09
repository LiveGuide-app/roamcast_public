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

  useEffect(() => {
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

        // Get tips data directly from the tour object
        const totalTips = tour.total_tips || 0;
        const earnings = totalTips; // For now, earnings are just tips

        setStatistics({
          totalGuests: participantCount !== undefined ? participantCount : tour.total_participants,
          rating: averageRating,
          totalReviews: totalReviews,
          earnings: earnings,
          totalTips: totalTips,
          duration
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch statistics'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [tour?.id, tour?.status, participantCount]);

  // Helper function to format duration in MM:SS format
  const formatDuration = (durationMs: number): string => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    statistics,
    isLoading,
    error
  };
}; 