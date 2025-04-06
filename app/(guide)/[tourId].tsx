import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Tour as BaseTour, getTour, updateTourStatus, TourError } from '@/services/tour';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuideLiveKit } from '@/hooks/useGuideLiveKit';
import { Linking } from 'react-native';
import { Button } from '@/components/Button';

interface TourStatistics {
  totalGuests: number;
  rating: number | null;
  totalReviews: number;
  earnings: number;
  totalTips: number;
  duration: string | null;
}

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
  const [statistics, setStatistics] = useState<TourStatistics | null>(null);
  const [duration, setDuration] = useState<string>('00:00');
  const lastFetchTime = useRef<number>(Date.now());
  const { 
    isConnected, 
    connect, 
    disconnect, 
    remoteParticipants, 
    toggleMicrophone,
    isMicrophoneEnabled 
  } = useGuideLiveKit(tourId || '');

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

      // Refetch tour data every 5 minutes to stay in sync
      if (now - lastFetchTime.current >= 300000) { // 5 minutes
        fetchTour();
        lastFetchTime.current = now;
      }
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

  // Fetch tour data
  const fetchTour = async () => {
    try {
      if (!tourId) {
        throw new Error('Tour ID is required');
      }
      const tourData = await getTour(tourId);
      setTour(tourData);

      if (tourData.status === 'completed') {
        // Calculate duration
        const startTime = tourData.room_started_at ? new Date(tourData.room_started_at) : null;
        const endTime = tourData.room_finished_at ? new Date(tourData.room_finished_at) : null;
        const duration = startTime && endTime ? 
          new Date(endTime.getTime() - startTime.getTime())
            .toISOString()
            .substr(11, 5) // Get HH:mm format
          : null;

        // Get feedback statistics
        const feedbackResponse = await fetch(`/api/tours/${tourId}/feedback`);
        const feedbackData = await feedbackResponse.json();
        
        // Get earnings statistics
        const tipsResponse = await fetch(`/api/tours/${tourId}/tips`);
        const tipsData = await tipsResponse.json();

        setStatistics({
          totalGuests: tourData.total_participants,
          rating: feedbackData.averageRating || null,
          totalReviews: feedbackData.totalReviews || 0,
          earnings: tipsData.totalAmount || 0,
          totalTips: tipsData.totalTips || 0,
          duration
        });
      }
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to load tour');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTour();
  }, [tourId]);

  const handleStartTour = async () => {
    if (!tour || !tourId) return;
    
    try {
      // Update tour status and connect to room
      const updatedTour = await updateTourStatus(tour.id, 'active');
      setTour(updatedTour);

      // Connect to LiveKit room
      await connect();
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to start tour');
        await updateTourStatus(tour.id, 'pending');
        setTour({ ...tour, status: 'pending' });
      }
    }
  };

  const handleEndTour = async () => {
    if (!tour) return;
    
    try {
      // First disconnect from LiveKit room
      await disconnect();
      
      // Then update tour status
      const updatedTour = await updateTourStatus(tour.id, 'completed');
      setTour(updatedTour);
      router.push('/(guide)/(tabs)/tours');
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to end tour');
      }
    }
  };

  const handleToggleMicrophone = async () => {
    try {
      await toggleMicrophone(!isMicrophoneEnabled);
    } catch (error) {
      console.error('Error toggling microphone:', error);
      Alert.alert('Error', 'Failed to toggle microphone');
    }
  };

  const handleCancelTour = () => {
    Alert.alert(
      'Cancel Tour',
      'Are you sure you want to cancel this tour?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => router.push('/(guide)/(tabs)/tours')
        }
      ]
    );
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
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tour.name}</Text>
        </View>

        <View style={styles.contentContainer}>
          {tour.status === 'pending' ? (
            <>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Pending</Text>
              </View>

              <View style={styles.codeSection}>
                <Text style={styles.sectionTitle}>Tour Code</Text>
                <Text style={styles.codeText}>{tour.unique_code}</Text>
                <Text style={styles.helperText}>Give this code to your guests so they can join the tour.</Text>
              </View>

              <View style={styles.guestsSection}>
                <Text style={styles.sectionTitle}>Guests</Text>
                <Text style={styles.guestsCount}>{remoteParticipants.length}</Text>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title="Start Tour"
                  onPress={handleStartTour}
                />
                <Button
                  title="Cancel Tour"
                  variant="danger-outline"
                  onPress={handleCancelTour}
                />
              </View>
            </>
          ) : tour.status === 'active' ? (
            <>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, styles.statusBadgeLive]}>
                  <Text style={styles.statusText}>LIVE</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: isConnected ? colors.success.main : colors.error.main }
                ]}>
                  <Text style={styles.statusText}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
              </View>

              <View style={styles.codeSection}>
                <Text style={styles.sectionTitle}>Tour Code</Text>
                <Text style={styles.codeText}>{tour.unique_code}</Text>
              </View>

              <View style={styles.metricsContainer}>
                <View style={styles.metricCard}>
                  <Text style={styles.sectionTitle}>Guests</Text>
                  <Text style={styles.metricValue}>{remoteParticipants.length}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.sectionTitle}>Duration</Text>
                  <Text style={styles.metricValue}>{duration}</Text>
                </View>
              </View>

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
                />
              </View>
            </>
          ) : tour.status === 'completed' ? (
            <>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: colors.success.main }]}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Statistics</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>Total Guests</Text>
                  <Text style={styles.statsValue}>{statistics?.totalGuests || 0}</Text>
                </View>

                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>Rating</Text>
                  {statistics?.rating ? (
                    <>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={20} color={colors.warning.main} />
                        <Text style={styles.statsValue}>{statistics.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.statsSubtext}>
                        ({statistics.totalReviews} review{statistics.totalReviews !== 1 ? 's' : ''})
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.statsValue}>N/A</Text>
                  )}
                </View>

                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>Earnings</Text>
                  <Text style={styles.statsValue}>£{statistics?.earnings || 0}</Text>
                  {statistics?.totalTips ? (
                    <Text style={styles.statsSubtext}>
                      ({statistics.totalTips} tip{statistics.totalTips !== 1 ? 's' : ''})
                    </Text>
                  ) : null}
                </View>

                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>Duration</Text>
                  <Text style={styles.statsValue}>{statistics?.duration || '00:00'}</Text>
                </View>
              </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.white,
    flex: 1,
    marginLeft: spacing.sm,
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: colors.warning.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.xl,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
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
  guestsSection: {
    width: '100%',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  guestsCount: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text.primary,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    width: '100%',
    ...shadows.small,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '500',
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
  connectedText: {
    color: colors.success.main,
  },
  disconnectedText: {
    color: colors.error.main,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statusBadgeLive: {
    backgroundColor: colors.warning.main,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.small,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },
  statsLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statsSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
}); 