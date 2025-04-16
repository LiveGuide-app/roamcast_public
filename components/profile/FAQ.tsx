import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors, spacing } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';

interface FAQProps {
  faqUrl?: string;
}

export const FAQ: React.FC<FAQProps> = ({ faqUrl = 'https://roamcast.me/faq' }) => {
  const handlePress = () => {
    Linking.openURL(faqUrl);
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={styles.section}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    marginTop: spacing.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
}); 