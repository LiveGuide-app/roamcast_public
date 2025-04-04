import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';

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
      <Text style={styles.sectionTitle}>Payment Settings</Text>
      <Text style={styles.sectionDescription}>
        Roamcast helps you earn tips from guests after each tour. They'll be prompted to leave a review and send an optional tip. Securely set up or link your Stripe account below to receive payments directly. A small processing fee applies.
      </Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary.main} />
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={onStripePress}
        >
          <Text style={styles.buttonText}>
            {stripeAccountEnabled ? 'Open Stripe Dashboard' : 'Set up payments'}
          </Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#008080',
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '500',
  },
}); 