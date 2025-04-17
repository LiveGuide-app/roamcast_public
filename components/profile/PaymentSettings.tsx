import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { colors, spacing } from '@/config/theme';
import { Button } from '@/components/Button';

interface PaymentSettingsProps {
  stripeAccountEnabled: boolean;
  isLoading: boolean;
  onStripePress: () => void;
  recentTourCount?: number;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({
  stripeAccountEnabled,
  isLoading,
  onStripePress,
  recentTourCount = 0,
}) => {
  const tourLimit = 2;
  const tourLimitText = stripeAccountEnabled 
    ? 'Unlimited tours available' 
    : `${recentTourCount}/${tourLimit} tours used in the last 7 days`;

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
              {stripeAccountEnabled ? 'Payments Connected' : 'Payments Not Connected'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionDescription}>
      Roamcast makes it easy to earn tips after each tour. Guests can tip you directly in the app. Set up or link your free{' '}
        <Text 
          style={{ color: colors.primary.main, textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL('https://stripe.com')}
        >
          Stripe
        </Text>
        {' '}account below to get paid—setup takes just 5 minutes. A small processing fee applies.
      </Text>
      
      {isLoading ? (
        <ActivityIndicator color={colors.primary.main} />
      ) : (
        <Button
          title={stripeAccountEnabled ? 'Control your Earnings in your Dashboard' : 'Set up Tip Payments'}
          variant="primary"
          onPress={onStripePress}
        />
      )}
      
      <View style={styles.tourLimitContainer}>
        <Text style={[
          styles.tourLimitText, 
          { color: stripeAccountEnabled ? colors.success.main : (recentTourCount >= tourLimit ? colors.error.main : colors.warning.main) }
        ]}>
          {tourLimitText}
        </Text>
        {!stripeAccountEnabled && (
          <Text style={styles.tourLimitDescription}>
            Connect your Stripe account to get unlimited tours
          </Text>
        )}
      </View>
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
  tourLimitContainer: {

    padding: spacing.md,
    backgroundColor: colors.background.default,
    borderRadius: 8,
  },
  tourLimitText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  tourLimitDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
}); 