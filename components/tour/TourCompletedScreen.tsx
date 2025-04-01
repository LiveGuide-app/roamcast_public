import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour, TipAmount } from '@/types/tour';
import { Ionicons } from '@expo/vector-icons';

type TourCompletedScreenProps = {
  tour: Tour;
  onRatingSubmit: (rating: number) => Promise<void>;
  onTipSubmit: (amount: TipAmount) => Promise<void>;
  onLeaveTour: () => void;
};

export const TourCompletedScreen = ({ 
  tour, 
  onRatingSubmit, 
  onTipSubmit, 
  onLeaveTour 
}: TourCompletedScreenProps) => {
  const handleRating = async (rating: number) => {
    try {
      await onRatingSubmit(rating);
      Alert.alert('Success', 'Thank you for your rating!');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const handleTip = async (amount: TipAmount) => {
    try {
      await onTipSubmit(amount);
      Alert.alert('Success', 'Thank you for your tip!');
    } catch (error) {
      Alert.alert('Error', 'Failed to process tip. Please try again.');
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
          <Text style={styles.sectionTitle}>Leave a Tip</Text>
          <View style={styles.tipOptions}>
            {[500, 1000, 2000, 5000].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.tipButton}
                onPress={() => handleTip(amount as TipAmount)}
              >
                <Text style={styles.tipAmount}>${(amount / 100).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  tipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tipButton: {
    backgroundColor: colors.background.default,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: '45%',
    alignItems: 'center',
  },
  tipAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
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
}); 