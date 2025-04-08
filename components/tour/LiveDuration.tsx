import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tour } from '@/services/tour';
import { colors } from '@/config/theme';

interface LiveDurationProps {
  tour: Tour;
}

export const LiveDuration: React.FC<LiveDurationProps> = ({ tour }) => {
  const [duration, setDuration] = useState<string>('00:00');
  const startTimeRef = useRef<number>(Date.now());

  // Function to format duration
  const formatDuration = useCallback((durationMs: number): string => {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Effect to handle duration updates
  useEffect(() => {

    // Use room_started_at if available, otherwise use the time when component first mounted
    const startTime = tour.room_started_at 
      ? new Date(tour.room_started_at).getTime()
      : startTimeRef.current;

    const updateDuration = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      setDuration(formatDuration(elapsed));
    };

    // Initial update
    updateDuration();

    // Update every second
    const intervalId = setInterval(updateDuration, 1000);

    // Cleanup interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tour.room_started_at, formatDuration]);

  return <Text style={styles.durationText}>{duration}</Text>;
};

const styles = StyleSheet.create({
  durationText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  }
}); 