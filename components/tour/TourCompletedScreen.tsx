import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/types/tour';
import { Ionicons } from '@expo/vector-icons';
import { TipPayment } from '../../app/components/TipPayment';
import { ConnectedStripeProvider } from '@/app/components/ConnectedStripeProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Define a more precise type for the tour data
interface TourWithStripe {
  id: string;
  guide_id: string;
  guide_stripe_account_id?: string;
}

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
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the guide's stripe account ID when component mounts
    const fetchStripeAccountId = async () => {
      try {
        setIsLoading(true);

        // First get the tour details to get the guide ID
        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('guide_id')
          .eq('id', tour.id)
          .single();
        
        if (tourError) throw tourError;
        
        if (!tourData?.guide_id) {
          console.warn('Could not find guide ID for this tour');
          return;
        }
        
        // Now get the guide's stripe account ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('stripe_account_id')
          .eq('id', tourData.guide_id)
          .single();
        
        if (userError) throw userError;
        
        if (userData?.stripe_account_id) {
          setStripeAccountId(userData.stripe_account_id);
        } else {
          console.warn('Guide does not have a Stripe account set up');
        }
      } catch (error) {
        console.error('Error fetching stripe account ID:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStripeAccountId();
  }, [tour.id]);

  const handleRating = async (rating: number) => {
    try {
      await onRatingSubmit(rating);
      Alert.alert('Success', 'Thank you for your rating!');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  return (
    <View style={styles.contentContainer}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Tour Completed</Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.tourName}>{tour.name}</Text>
        
        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Your Experience</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name="star"
                  size={32}
                  color={colors.primary.main}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tipping Section */}
        <View style={styles.section}>
          {tour.participant_id && stripeAccountId ? (
            <ConnectedStripeProvider stripeAccountId={stripeAccountId}>
              <TipPayment tourParticipantId={tour.participant_id} />
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
      </View>

      <TouchableOpacity 
        style={styles.leaveButton}
        onPress={onLeaveTour}
      >
        <Text style={styles.leaveButtonText}>Leave Tour</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  statusBadge: {
    backgroundColor: colors.success.light,
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
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starButton: {
    padding: spacing.xs,
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
  messageText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
}); 