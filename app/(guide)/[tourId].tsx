import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
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
import { useTourStatistics } from '@/hooks/tour/useTourStatistics';
import { useTourActions } from '@/hooks/tour/useTourActions';
import { useParticipantCount } from '@/hooks/tour/useParticipantCount';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

// Extend the base Tour type with the additional fields we need
interface Tour extends BaseTour {
  room_started_at: string | null;
  room_finished_at: string | null;
  total_participants: number;
}

// Function to format duration
const formatDuration = (durationMs: number): string => {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function LiveTourDetail() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingTour, setIsEndingTour] = useState(false);
  
  // Use the new hook for participant count
  const participantCount = useParticipantCount(tourId || null, tour);
  
  // Log participant count changes
  React.useEffect(() => {
    console.log('Participant count in UI:', participantCount);
  }, [participantCount]);

  const { 
    isConnected, 
    connect, 
    disconnect, 
    remoteParticipants, 
    toggleMicrophone,
    isMicrophoneEnabled 
  } = useGuideLiveKit(tourId || '');

  const { statistics } = useTourStatistics(tour, participantCount);
  const { 
    handleStartTour, 
    handleEndTour: originalHandleEndTour, 
    handleCancelTour, 
    handleDeleteTour,
    isUpdating 
  } = useTourActions({ 
    tour, 
    connect: connect, 
    disconnect: disconnect,
    onTourUpdate: setTour 
  });

  // Wrap handleEndTour to set isEndingTour state
  const handleEndTour = useCallback(async () => {
    setIsEndingTour(true);
    try {
      await originalHandleEndTour();
    } finally {
      setIsEndingTour(false);
    }
  }, [originalHandleEndTour]);

  // Handle navigation state changes
  useFocusEffect(
    useCallback(() => {
      // Component is focused (user navigated to this screen)
      console.log('Guide tour screen focused');
      
      // Reconnect if tour is active, not connected, and not ending
      if (tour?.status === 'active' && !isConnected && !isEndingTour) {
        console.log('Returned to active tour, reconnecting to LiveKit');
        connect().catch(error => {
          console.error('Failed to reconnect to LiveKit:', error);
        });
      }
      
      return () => {
        // Component is unfocused (user navigated away from this screen)
        console.log('Guide tour screen unfocused');
        if (tour?.status === 'active' && isConnected && !isEndingTour) {
          console.log('Navigated away from active tour, disconnecting');
          disconnect().catch(console.error);
        }
      };
    }, [tour?.status, isConnected, connect, disconnect, isEndingTour])
  );

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
        <Button
          title="Back to tours"
          variant="outline"
          onPress={() => router.replace('/(guide)/(tabs)/tours')}
        />
      </View>
    );
  }

  if (tour?.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <TourHeader
            title={tour.name}
            onBack={() => router.replace('/(guide)/(tabs)/tours')}
          />

          <View style={styles.contentContainer}>
            <StatusBadge status={tour.status} variant="large" />

            <View style={styles.codeSection}>
              <Text style={styles.sectionTitle}>Tour Code</Text>
              <Text style={styles.codeText}>{tour.unique_code}</Text>
            </View>

            <TourMetrics
              metrics={{
                guests: participantCount
              }}
              variant="row"
            />

            <View style={styles.buttonContainer}>
              <Button
                title="Back to tours"
                variant="outline"
                onPress={() => router.replace('/(guide)/(tabs)/tours')}
              />
              <Button
                title="Delete Tour"
                variant="danger-outline"
                onPress={handleDeleteTour}
                disabled={isUpdating}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <TourHeader
          title={tour.name}
          onBack={() => router.replace('/(guide)/(tabs)/tours')}
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
                  guests: participantCount
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
                  guests: participantCount,
                  duration: tour.room_finished_at ? 
                    formatDuration(new Date(tour.room_finished_at).getTime() - new Date(tour.room_started_at!).getTime()) : 
                    '00:00'
                }}
                tour={tour}
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
          ) : tour.status === 'completed' ? (
            <>
              <StatusBadge status={tour.status} variant="large" />

              <Text style={styles.sectionHeader}>Statistics</Text>

              {/* Debug timing info */}
              {(() => {
                console.log('Tour timing:', {
                  room_started_at: tour.room_started_at,
                  room_finished_at: tour.room_finished_at,
                  completed_at: tour.completed_at,
                  hasStatsDuration: !!statistics?.duration
                });
                return null;
              })()}

              <TourMetrics
                metrics={{
                  guests: statistics?.totalGuests || participantCount,
                  duration: formatDuration(
                    new Date(tour.room_finished_at || tour.completed_at || Date.now()).getTime() - 
                    new Date(tour.room_started_at || tour.created_at || Date.now()).getTime()
                  ),
                  rating: statistics?.rating,
                  totalReviews: statistics?.totalReviews,
                  earnings: statistics?.earnings,
                  totalTips: statistics?.totalTips,
                  completedAt: tour.completed_at
                }}
                tour={tour}
              />

              <View style={styles.buttonContainer}>
                <Button
                  title="Back to tours"
                  variant="outline"
                  onPress={() => router.replace('/(guide)/(tabs)/tours')}
                />
                <Button
                  title="Delete Tour"
                  variant="danger-outline"
                  onPress={handleDeleteTour}
                  disabled={isUpdating}
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
  }
});