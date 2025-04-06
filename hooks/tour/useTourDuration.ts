import { useState, useEffect, useCallback, useRef } from 'react';
import { Tour } from '@/services/tour';

export const useTourDuration = (tour: Tour | null) => {
  const [duration, setDuration] = useState<string>('00:00');
  const lastFetchTime = useRef<number>(Date.now());

  // Function to format duration
  const formatDuration = useCallback((durationMs: number): string => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Effect to handle duration updates
  useEffect(() => {
    if (!tour || tour.status !== 'active' || !tour.room_started_at) {
      return;
    }

    const startTime = new Date(tour.room_started_at).getTime();
    let intervalId: NodeJS.Timeout;

    // If room_finished_at exists, show final duration
    if (tour.room_finished_at) {
      const endTime = new Date(tour.room_finished_at).getTime();
      setDuration(formatDuration(endTime - startTime));
      return;
    }

    // Function to update duration
    const updateDuration = () => {
      const now = Date.now();
      setDuration(formatDuration(now - startTime));
    };

    // Initial update
    updateDuration();

    // Update every second
    intervalId = setInterval(updateDuration, 1000);

    // Cleanup interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tour?.room_started_at, tour?.room_finished_at, tour?.status, formatDuration]);

  return {
    duration,
    lastFetchTime: lastFetchTime.current
  };
}; 