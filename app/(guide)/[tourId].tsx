import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Tour as BaseTour, getTour } from '@/services/tour';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuideLiveKit } from '@/hooks/useGuideLiveKit';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/tour/StatusBadge';
import { TourMetrics } from '@/components/tour/TourMetrics';
import { TourHeader } from '@/components/tour/TourHeader';
import { useTourDuration } from '@/hooks/tour/useTourDuration';
import { useTourStatistics } from '@/hooks/tour/useTourStatistics';
import { useTourActions } from '@/hooks/tour/useTourActions';

// Extend the base Tour type with the additional fields we need
interface Tour extends BaseTour {
  room_started_at: string | null;
  room_finished_at: string | null;
  total_participants: number;
}

export default function LiveTourDetail() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { 
    isConnected, 
    connect, 
    disconnect, 
    remoteParticipants, 
    toggleMicrophone,
    isMicrophoneEnabled 
  } = useGuideLiveKit(tourId || '');

  const { duration } = useTourDuration(tour);
  const { statistics } = useTourStatistics(tour);
  const { handleStartTour, handleEndTour, handleCancelTour, isUpdating } = useTourActions({
    tour,
    connect,
    disconnect,
    onTourUpdate: (updatedTour) => setTour(updatedTour)
  });

  // Fetch tour data
  const fetchTour = async () => {
    try {
      if (!tourId) {
        throw new Error('Tour ID is required');
      }
      const tourData = await getTour(tourId);
      setTour(tourData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load tour');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTour();
  }, [tourId]);

  const handleToggleMicrophone = async () => {
    try {
      await toggleMicrophone(!isMicrophoneEnabled);
    } catch (error) {
      console.error('Error toggling microphone:', error);
      Alert.alert('Error', 'Failed to toggle microphone');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!tour) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tour not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <TourHeader
          title={tour.name}
          onBack={() => router.back()}
        />

        <View style={styles.contentContainer}>
          {tour.status === 'pending' ? (
            <>
              <StatusBadge status={tour.status} variant="large" />

              <View style={styles.codeSection}>
                <Text style={styles.sectionTitle}>Tour Code</Text>
                <Text style={styles.codeText}>{tour.unique_code}</Text>
                <Text style={styles.helperText}>Give this code to your guests so they can join the tour.</Text>
              </View>

              <TourMetrics
                metrics={{
                  guests: remoteParticipants.length
                }}
                variant="row"
              />

              <View style={styles.buttonContainer}>
                <Button
                  title="Start Tour"
                  onPress={handleStartTour}
                  disabled={isUpdating}
                />
                <Button
                  title="Cancel Tour"
                  variant="danger-outline"
                  onPress={handleCancelTour}
                  disabled={isUpdating}
                />
              </View>
            </>
          ) : tour.status === 'active' ? (
            <>
              <StatusBadge 
                status={tour.status} 
                isConnected={isConnected}
                variant="large"
              />

              <View style={styles.codeSection}>
                <Text style={styles.sectionTitle}>Tour Code</Text>
                <Text style={styles.codeText}>{tour.unique_code}</Text>
              </View>

              <TourMetrics
                metrics={{
                  guests: remoteParticipants.length,
                  duration: duration
                }}
                variant="row"
              />

              <View style={styles.microphoneContainer}>
                <TouchableOpacity 
                  style={[styles.micButton, !isMicrophoneEnabled && styles.micButtonActive]} 
                  onPress={handleToggleMicrophone}
                >
                  <Ionicons 
                    name={isMicrophoneEnabled ? "mic" : "mic-off"} 
                    size={24} 
                    color={isMicrophoneEnabled ? colors.text.primary : colors.error.main} 
                  />
                  <Text style={[styles.micButtonText, !isMicrophoneEnabled && styles.micButtonTextActive]}>
                    {isMicrophoneEnabled ? 'Microphone On' : 'Microphone Off'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title="End Tour"
                  variant="danger-outline"
                  onPress={handleEndTour}
                  disabled={isUpdating}
                />
              </View>
            </>
          ) : tour.status === 'completed' && statistics ? (
            <>
              <StatusBadge status={tour.status} variant="large" />

              <Text style={styles.sectionHeader}>Statistics</Text>

              <TourMetrics
                metrics={{
                  guests: statistics.totalGuests,
                  duration: statistics.duration || '00:00',
                  rating: statistics.rating,
                  totalReviews: statistics.totalReviews,
                  earnings: statistics.earnings,
                  totalTips: statistics.totalTips,
                  completedAt: tour.completed_at
                }}
              />

              <View style={styles.buttonContainer}>
                <Button
                  title="Back to tours"
                  variant="outline"
                  onPress={() => router.push('/(guide)/(tabs)/tours')}
                />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  codeSection: {
    width: '100%',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
    gap: spacing.md,
  },
  microphoneContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
    width: '100%',
    marginTop: spacing.md,
    ...shadows.small,
  },
  micButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  micButtonActive: {
    backgroundColor: colors.primary.main,
  },
  micButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  micButtonTextActive: {
    color: colors.text.white,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
});