import { useState, useEffect } from 'react';
import { Tour } from '@/services/tour';

interface TourStatistics {
  totalGuests: number;
  rating: number | null;
  totalReviews: number;
  earnings: number;
  totalTips: number;
  duration: string | null;
}

export const useTourStatistics = (tour: Tour | null) => {
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

        // Get feedback statistics
        const feedbackResponse = await fetch(`/api/tours/${tour.id}/feedback`);
        const feedbackData = await feedbackResponse.json();
        
        // Get earnings statistics
        const tipsResponse = await fetch(`/api/tours/${tour.id}/tips`);
        const tipsData = await tipsResponse.json();

        setStatistics({
          totalGuests: tour.total_participants,
          rating: feedbackData.averageRating || null,
          totalReviews: feedbackData.totalReviews || 0,
          earnings: tipsData.totalAmount || 0,
          totalTips: tipsData.totalTips || 0,
          duration
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch statistics'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [tour?.id, tour?.status]);

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