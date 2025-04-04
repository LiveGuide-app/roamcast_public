import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/config/theme';

export const FAQ: React.FC = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>FAQ</Text>
      {/* Placeholder for future FAQ content */}
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
}); 