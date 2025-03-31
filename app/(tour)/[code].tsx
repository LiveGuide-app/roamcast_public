import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Tour, getTourByCode, updateParticipantLeaveTime, submitTourRating, TourError } from '../../services/tour';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDeviceId } from '../../services/device';
import { useGuestLiveKit } from '@/hooks/useGuestLiveKit';
import { supabase } from '@/lib/supabase';
import { useStripe } from '@stripe/stripe-react-native';
import { formatCurrency } from '../../utils/currency';

export default function TourCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);
  const [tourParticipantId, setTourParticipantId] = useState<string | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { 
    isConnected, 
    connect, 
    disconnect, 
    remoteParticipants 
  } = useGuestLiveKit(tour?.id || '');

  // Add effect to initialize payment sheet when tour is completed
  useEffect(() => {
    if (tour?.status === 'completed' && tourParticipantId) {
      initializePaymentSheet();
    }
  }, [tour?.status, tourParticipantId]);

  useEffect(() => {
    let subscription: any;

    async function fetchTour() {
      try {
        if (!code) {
          throw new Error('Tour code is required');
        }
        const tourData = await getTourByCode(code);
        setTour(tourData);

        // Get the tour participant ID
        const deviceId = await getDeviceId();
        console.log('Fetching tour participant with:', { tourId: tourData.id, deviceId });
        
        const { data: participant, error: participantError } = await supabase
          .from('tour_participants')
          .select('id')
          .eq('tour_id', tourData.id)
          .eq('device_id', deviceId)
          .single();

        if (participantError) {
          console.error('Error fetching tour participant:', participantError);
          throw participantError;
        }

        console.log('Found tour participant:', participant);
        if (participant) {
          setTourParticipantId(participant.id);
        } else {
          console.error('No tour participant found for:', { tourId: tourData.id, deviceId });
        }

        // Set up real-time subscription for tour updates
        subscription = supabase
          .channel(`tour-${tourData.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tours',
              filter: `id=eq.${tourData.id}`,
            },
            async (payload) => {
              const updatedTour = payload.new as Tour;
              setTour(updatedTour);

              // Only connect if we're not already connected and tour is active
              if (updatedTour.status === 'active' && updatedTour.id && !isConnected) {
                console.log('Tour became active, connecting to LiveKit');
                await connect();
              } else if (updatedTour.status !== 'active' && isConnected) {
                // Only disconnect if we're currently connected
                console.log('Tour no longer active, disconnecting');
                await disconnect();
              }
            }
          )
          .subscribe();

        // If tour is already active and we're not connected, connect immediately
        if (tourData.status === 'active' && tourData.id && !isConnected) {
          console.log('Tour is already active, connecting to LiveKit');
          await connect();
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
    }

    fetchTour();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      disconnect();
    };
  }, [code, connect, disconnect, isConnected]);

  const handleLeaveTour = async () => {
    if (!tour) return;
    
    // Skip confirmation if tour is completed
    if (tour.status === 'completed') {
      try {
        await disconnect();
        const deviceId = await getDeviceId();
        await updateParticipantLeaveTime(tour.id, deviceId);
        router.push('/');
      } catch (error) {
        if (error instanceof TourError) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Error', 'Failed to leave tour');
        }
      }
      return;
    }
    
    Alert.alert(
      'Leave Tour',
      'Are you sure you want to leave this tour?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              // First disconnect from LiveKit room
              await disconnect();
              
              // Then update participant leave time
              const deviceId = await getDeviceId();
              await updateParticipantLeaveTime(tour.id, deviceId);
              router.push('/');
            } catch (error) {
              if (error instanceof TourError) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Error', 'Failed to leave tour');
              }
            }
          }
        }
      ]
    );
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!tour) return;
    
    try {
      const deviceId = await getDeviceId();
      await submitTourRating(tour.id, deviceId, rating);

    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to submit rating');
      }
    }
  };

  const initializePaymentSheet = async () => {
    try {
      console.log('Initializing payment sheet...');
      setTipLoading(true);
      
      if (!tourParticipantId) {
        console.error('No tour participant ID found');
        throw new Error('Tour participant not found');
      }

      const deviceId = await getDeviceId();
      console.log('Creating payment intent...');
      // Create payment intent using Supabase client
      const { data, error } = await supabase.functions.invoke('stripe-tip-payment', {
        body: {
          tourParticipantId,
          amount: 1000, // Default amount, will be updated when user selects tip
          currency: 'gbp',
          deviceId,
        },
      });

      if (error) {
        console.error('Payment intent error:', error);
        throw new Error(error.message);
      }

      const { paymentIntent } = data;

      console.log('Initializing Stripe payment sheet...');
      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Roamcast',
        paymentIntentClientSecret: paymentIntent,
        // Allow delayed payment methods like US bank accounts
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: 'Guest',
        },
      });

      if (initError) {
        console.error('Payment sheet init error:', initError);
        throw initError;
      }

      console.log('Payment sheet initialized successfully');
      setPaymentSheetReady(true);
    } catch (err) {
      console.error('Payment sheet initialization error:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initialize payment'
      );
    } finally {
      setTipLoading(false);
    }
  };

  const handleTip = async (amount: number) => {
    try {
      setTipLoading(true);
      
      if (!tourParticipantId) {
        throw new Error('Tour participant not found');
      }

      const deviceId = await getDeviceId();
      // Update payment intent with selected amount using Supabase client
      const { data, error } = await supabase.functions.invoke('stripe-tip-payment', {
        body: {
          tourParticipantId,
          amount,
          currency: 'gbp',
          deviceId,
        },
      });

      if (error) throw new Error(error.message);

      const { paymentIntent } = data;

      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          // User canceled the payment
          return;
        }
        throw paymentError;
      }

      // Payment successful
      Alert.alert('Success', 'Thank you for your tip!');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong'
      );
    } finally {
      setTipLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (!tour) {
    return null;
  }

  const renderPendingScreen = () => (
    <View style={styles.contentContainer}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Waiting for Guide</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.tourName}>{tour.name}</Text>
        <Text style={styles.waitingText}>
          Please wait for your guide to begin the tour
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.leaveButton}
        onPress={handleLeaveTour}
      >
        <Text style={styles.leaveButtonText}>Leave Tour</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveScreen = () => (
    <View style={styles.contentContainer}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Live Tour</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.tourName}>{tour.name}</Text>
        
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, isConnected ? styles.connectedDot : styles.disconnectedDot]} />
          <Text style={[styles.connectionText, isConnected ? styles.connectedText : styles.disconnectedText]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.audioControls}>
          <View style={styles.waveformContainer}>
            <Ionicons name="radio" size={24} color={colors.primary.main} />
            <View style={styles.waveform}>
              {[...Array(5)].map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.waveformBar,
                    isConnected && styles.waveformBarActive
                  ]} 
                />
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.muteButton, isMuted && styles.muteButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color={isMuted ? colors.text.secondary : colors.primary.main}
            />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.leaveButton}
        onPress={handleLeaveTour}
      >
        <Text style={styles.leaveButtonText}>Leave Tour</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompletedScreen = () => (
    <View style={styles.contentContainer}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Tour Completed</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.tourName}>{tour.name}</Text>
        <Text style={styles.ratingText}>How was your tour?</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={styles.ratingStar}
              onPress={() => {
                setSelectedRating(rating);
                handleRatingSubmit(rating);
              }}
            >
              <Ionicons 
                name={rating <= (selectedRating || 0) ? "star" : "star-outline"} 
                size={32} 
                color={colors.primary.main} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tippingSection}>
          <Text style={styles.tippingTitle}>Leave a Tip</Text>
          {tipLoading ? (
            <ActivityIndicator color={colors.primary.main} />
          ) : (
            <View style={styles.tipOptions}>
              <TouchableOpacity
                style={[styles.tipButton, !paymentSheetReady && styles.disabledButton]}
                onPress={() => handleTip(500)}
                disabled={!paymentSheetReady || tipLoading}
              >
                <Text style={styles.tipButtonText}>{formatCurrency(500, 'gbp')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipButton, !paymentSheetReady && styles.disabledButton]}
                onPress={() => handleTip(1000)}
                disabled={!paymentSheetReady || tipLoading}
              >
                <Text style={styles.tipButtonText}>{formatCurrency(1000, 'gbp')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipButton, !paymentSheetReady && styles.disabledButton]}
                onPress={() => handleTip(2000)}
                disabled={!paymentSheetReady || tipLoading}
              >
                <Text style={styles.tipButtonText}>{formatCurrency(2000, 'gbp')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleLeaveTour}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {tour.status === 'pending' && renderPendingScreen()}
      {tour.status === 'active' && renderActiveScreen()}
      {tour.status === 'completed' && renderCompletedScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  statusBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.small,
    flex: 1,
  },
  tourName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  waitingText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  waveformBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary.main,
    marginHorizontal: 2,
    borderRadius: borderRadius.sm,
  },
  muteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.default,
  },
  muteButtonActive: {
    backgroundColor: colors.background.paper,
  },
  ratingText: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingStar: {
    padding: spacing.sm,
  },
  leaveButton: {
    backgroundColor: colors.error.main,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  leaveButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  connectedDot: {
    backgroundColor: colors.success.main,
  },
  disconnectedDot: {
    backgroundColor: colors.error.main,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectedText: {
    color: colors.success.main,
  },
  disconnectedText: {
    color: colors.error.main,
  },
  waveformBarActive: {
    backgroundColor: colors.success.main,
  },
  tippingSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tippingTitle: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tipOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tipButton: {
    backgroundColor: colors.primary.main,
    padding: spacing.md,
    borderRadius: borderRadius.round,
    minWidth: 100,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  tipButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 