import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/services/tour';

type TourPendingScreenProps = {
  tour: Tour;
  onLeaveTour: () => void;
};

export const TourPendingScreen = ({ tour, onLeaveTour }: TourPendingScreenProps) => {
  return (
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