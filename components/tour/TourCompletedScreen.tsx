import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Image } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/types/tour';
import { Ionicons } from '@expo/vector-icons';
import { TipPayment, TipPaymentHandle } from '../../app/components/TipPayment';
import { ConnectedStripeProvider } from '@/app/components/ConnectedStripeProvider';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { useRouter } from 'expo-router';
import { getDeviceId } from '@/services/device';

type GuideInfo = {
  full_name: string;
  avatar_url: string | null;
};

type TourCompletedScreenProps = {
  tour: Tour;
  onRatingSubmit: (rating: number) => Promise<void>;
  onLeaveTour: () => void;
};

export const TourCompletedScreen = ({ 
  tour, 
  onRatingSubmit,
  onLeaveTour 
}: TourCompletedScreenProps) => {
  const router = useRouter();
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const tipPaymentRef = useRef<TipPaymentHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Import and use getDeviceId
        const deviceId = await getDeviceId();
        
        // Fetch both tour participant and guide info in parallel
        const [participantResult, tourResult] = await Promise.all([
          supabase
            .from('tour_participants')
            .select('id')
            .eq('tour_id', tour.id)
            .eq('device_id', deviceId)
            .single(),
          supabase
            .from('tours')
            .select('guide_id')
            .eq('id', tour.id)
            .single()
        ]);

        if (participantResult.error) {
          if (participantResult.error.code === 'PGRST116') {
            console.warn('No participant found for this tour');
            return;
          }
          throw participantResult.error;
        }
        if (tourResult.error) throw tourResult.error;
        
        // Set participant ID
        setParticipantId(participantResult.data.id);

        // Fetch guide info
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, profile_image_url, stripe_account_id')
          .eq('id', tourResult.data.guide_id)
          .single();

        if (userError) throw userError;
        
        setGuideInfo({
          full_name: userData.full_name,
          avatar_url: userData.profile_image_url
        });

        if (userData?.stripe_account_id) {
          setStripeAccountId(userData.stripe_account_id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tour.id]);

  const handleRating = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleTipAmountChange = (amount: number | null) => {
    setSelectedTipAmount(amount);
  };

  const handlePaymentReady = (ready: boolean) => {
    setIsPaymentReady(ready);
  };

  const handlePaymentComplete = async () => {
    try {
      // Submit the rating first
      await onRatingSubmit(selectedRating);
      setSelectedTipAmount(null);
      setIsPaymentReady(false);
      
      // Get the guide ID from the fetched data
      const { data: tourData } = await supabase
        .from('tours')
        .select('guide_id')
        .eq('id', tour.id)
        .single();

      if (tourData?.guide_id) {
        router.replace(`/(tour)/thank-you?guideId=${tourData.guide_id}`);
      } else {
        // Fallback to home if for some reason we can't get the guide ID
        router.replace('/');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating.');
    }
  };

  const formatTipAmount = (amount: number | null) => {
    if (!amount) return '£0';
    return `£${(amount / 100).toFixed(2)}`;
  };

  const getButtonTitle = () => {
    if (isSubmitting) return "Processing...";
    if (selectedRating === 0) return "Select a Rating";
    if (!selectedTipAmount) return `Submit Rating`;
    return `Submit Rating & Tip ${formatTipAmount(selectedTipAmount)}`;
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      Alert.alert('Error', 'Please select a rating before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedTipAmount && isPaymentReady && tipPaymentRef.current) {
        await tipPaymentRef.current.handlePayment();
      } else {
        await onRatingSubmit(selectedRating);
        
        // Get the guide ID from the fetched data
        const { data: tourData } = await supabase
          .from('tours')
          .select('guide_id')
          .eq('id', tour.id)
          .single();

        if (tourData?.guide_id) {
          router.replace(`/(tour)/thank-you?guideId=${tourData.guide_id}`);
        } else {
          router.replace('/');
        }
      }
    } catch (error) {
      console.error('Error during submission:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tour Complete</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.contentContainer}>
          {guideInfo?.avatar_url ? (
            <Image 
              source={{ uri: guideInfo.avatar_url }} 
              style={styles.guideAvatar} 
            />
          ) : (
            <View style={styles.guideAvatar}>
              <Ionicons name="person" size={24} color={colors.text.white} />
            </View>
          )}
          <View style={styles.guideInfo}>
            <Text style={styles.guideName}>{tour.name}</Text>
            <Text style={styles.guideTitle}>With {guideInfo?.full_name || 'Tour Guide'}</Text>
          </View>
        </View>
        
        <View style={styles.sectionContainer}>
          <Text style={styles.ratingTitle}>How was your experience?</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= selectedRating ? "star" : "star-outline"}
                  size={32}
                  color={colors.primary.main}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.tipTitle}>Would you like to leave a tip?</Text>
          {participantId && stripeAccountId ? (
            <ConnectedStripeProvider stripeAccountId={stripeAccountId}>
              <TipPayment 
                ref={tipPaymentRef}
                tourParticipantId={participantId}
                onAmountChange={handleTipAmountChange}
                onPaymentReady={handlePaymentReady}
                onPaymentComplete={handlePaymentComplete}
              />
            </ConnectedStripeProvider>
          ) : participantId && !stripeAccountId && !isLoading ? (
            <Text style={styles.messageText}>
              Tipping is not available for this guide.
            </Text>
          ) : isLoading ? (
            <Text style={styles.messageText}>
              Loading payment options...
            </Text>
          ) : null}
        </View>

        <Button
          title={getButtonTitle()}
          variant="primary"
          onPress={handleSubmit}
          style={styles.submitButton}
          disabled={selectedRating === 0 || isSubmitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.white,
    flex: 1,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  content: {
    flex: 1,

  },
  tourName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  guideAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  guideInfo: {
    flex: 1,
  },
  guideName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  guideTitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  sectionContainer: {
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: spacing.xs,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  submitButton: {
    marginTop: 'auto',
  },
}); 