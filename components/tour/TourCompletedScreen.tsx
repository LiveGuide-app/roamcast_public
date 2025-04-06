import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Image } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/types/tour';
import { Ionicons } from '@expo/vector-icons';
import { TipPayment, TipPaymentHandle } from '../../app/components/TipPayment';
import { ConnectedStripeProvider } from '@/app/components/ConnectedStripeProvider';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

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
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tipPaymentRef = useRef<TipPaymentHandle>(null);

  useEffect(() => {
    const fetchGuideInfo = async () => {
      try {
        setIsLoading(true);
        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('guide_id')
          .eq('id', tour.id)
          .single();

        if (tourError) throw tourError;
        if (!tourData?.guide_id) throw new Error('No guide found for this tour');

        // Get both guide info and stripe account in one query
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, profile_image_url, stripe_account_id')
          .eq('id', tourData.guide_id)
          .single();

        if (userError) throw userError;
        
        setGuideInfo({
          full_name: userData.full_name,
          avatar_url: userData.profile_image_url
        });

        if (userData?.stripe_account_id) {
          setStripeAccountId(userData.stripe_account_id);
        } else {
          console.warn('Guide does not have a Stripe account set up');
        }
      } catch (error) {
        console.error('Error fetching guide info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuideInfo();
  }, [tour.id]);

  const handleRating = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleTipAmountChange = (amount: number | null) => {
    console.log('Tip amount changed:', amount); // Debug log
    setSelectedTipAmount(amount);
  };

  const handlePaymentReady = (ready: boolean) => {
    setIsPaymentReady(ready);
  };

  const handlePaymentComplete = () => {
    setSelectedTipAmount(null);
    setIsPaymentReady(false);
    onLeaveTour();
  };

  const formatTipAmount = (amount: number | null) => {
    if (!amount) return '£0';
    return `£${(amount / 100).toFixed(2)}`;
  };

  const getButtonTitle = () => {
    if (selectedRating === 0) return "Select a Rating";
    if (!selectedTipAmount) return `Submit Rating`;
    return `Submit Rating & Tip ${formatTipAmount(selectedTipAmount)}`;
  };

  const handleSubmit = async () => {
    try {
      if (selectedRating === 0) {
        Alert.alert('Error', 'Please select a rating before submitting');
        return;
      }

      // Submit rating first
      await onRatingSubmit(selectedRating);

      // If there's a tip amount selected and payment is ready, process the payment
      if (selectedTipAmount && isPaymentReady && tipPaymentRef.current) {
        await tipPaymentRef.current.handlePayment();
      } else {
        // If no tip or payment not ready, just leave the tour
        Alert.alert('Success', 'Thank you for your rating!');
        onLeaveTour();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit. Please try again.');
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
          {tour.participant_id && stripeAccountId ? (
            <ConnectedStripeProvider stripeAccountId={stripeAccountId}>
              <TipPayment 
                ref={tipPaymentRef}
                tourParticipantId={tour.participant_id}
                onAmountChange={handleTipAmountChange}
                onPaymentReady={handlePaymentReady}
                onPaymentComplete={handlePaymentComplete}
              />
            </ConnectedStripeProvider>
          ) : tour.participant_id && !stripeAccountId && !isLoading ? (
            <Text style={styles.messageText}>
              Tipping is not available for this guide.
            </Text>
          ) : tour.participant_id && isLoading ? (
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
          disabled={selectedRating === 0}
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