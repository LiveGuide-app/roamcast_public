import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing } from '@/config/theme';
import { Button } from '@/components/Button';

interface PaymentSettingsProps {
  stripeAccountEnabled: boolean;
  isLoading: boolean;
  onStripePress: () => void;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({
  stripeAccountEnabled,
  isLoading,
  onStripePress,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Tip Payment Settings</Text>
        {!isLoading && (
          <View style={[
            styles.statusBadge, 
            { backgroundColor: stripeAccountEnabled ? colors.success.light : colors.warning.light }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: stripeAccountEnabled ? colors.background.paper : colors.background.paper }
            ]}>
              {stripeAccountEnabled ? 'Stripe Connected' : 'Stripe Not Connected'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionDescription}>
        Roamcast helps you earn tips from guests after each tour. They'll be prompted to leave a review and send an optional tip. Securely set up or link your Stripe account below to receive payments directly. A small processing fee applies.
      </Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary.main} />
      ) : (
        <Button
          title={stripeAccountEnabled ? 'See Earnings in Stripe Dashbaord' : 'Set up tip payments'}
          variant="primary"
          onPress={onStripePress}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    marginTop: spacing.md,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
}); 