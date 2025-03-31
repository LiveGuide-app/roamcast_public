import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Tour, getTour, updateTourStatus, TourError } from '@/services/tour';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuideLiveKit } from '@/hooks/useGuideLiveKit';
import { Linking } from 'react-native';

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

  useEffect(() => {
    let subscription: any;

    async function fetchTour() {
      try {
        if (!tourId) {
          throw new Error('Tour ID is required');
        }
        console.log('Fetching tour with ID:', tourId);
        const tourData = await getTour(tourId);
        setTour(tourData);
      } catch (error) {
        if (error instanceof TourError) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Error', 'Failed to load tour');
        }
      } finally {
        setIsLoading(false);
      }
    }

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
    <SafeAreaView style={[styles.container, styles.safeArea]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/(guide)/(tabs)/tours')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tour.name}</Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{tour.status}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Tour Name</Text>
          <Text style={styles.value}>{tour.name}</Text>

          <Text style={styles.label}>Tour Code</Text>
          <Text style={styles.value}>{tour.unique_code}</Text>

          <Text style={styles.label}>Connection Status</Text>
          <Text style={[styles.value, isConnected ? styles.connectedText : styles.disconnectedText]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>

          <Text style={styles.label}>Participants</Text>
          <Text style={styles.value}>{remoteParticipants.length}</Text>
        </View>

        {tour.status === 'active' && (
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
        )}

        <View style={styles.buttonContainer}>
          {tour.status === 'pending' ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.startButton]}
                onPress={handleStartTour}
              >
                <Text style={styles.buttonText}>Start Tour</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelTour}
              >
                <Text style={styles.buttonText}>Cancel Tour</Text>
              </TouchableOpacity>
            </>
          ) : tour.status === 'active' ? (
            <TouchableOpacity 
              style={[styles.button, styles.endButton]}
              onPress={handleEndTour}
            >
              <Text style={styles.buttonText}>End Tour</Text>
            </TouchableOpacity>
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
  safeArea: {
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  backButton: {
    padding: spacing.sm,
    position: 'absolute',
    left: spacing.md,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  statusBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  buttonContainer: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: colors.primary.main,
  },
  endButton: {
    backgroundColor: colors.error.main,
  },
  cancelButton: {
    backgroundColor: colors.text.secondary,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
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
}); 