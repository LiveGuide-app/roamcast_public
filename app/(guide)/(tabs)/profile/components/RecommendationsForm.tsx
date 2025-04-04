import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';

interface RecommendationsFormProps {
  recommendationsLink: string | null;
  isLoading?: boolean;
  onSave: (link: string) => void;
}

export const RecommendationsForm: React.FC<RecommendationsFormProps> = ({
  recommendationsLink,
  isLoading = false,
  onSave,
}) => {
  const [link, setLink] = useState(recommendationsLink || '');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommendations</Text>
      <Text style={styles.sectionDescription}>
        You can add a link to a document such as a google sheet or pdf with recommendations that will be shown to your guests after the tour
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your recommendations link"
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={() => onSave(link)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#008080" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>
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
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background.default,
  },
  saveButton: {
    alignSelf: 'flex-end',
    opacity: 1,
  },
  saveButtonText: {
    color: '#008080',
    fontSize: 16,
    fontWeight: '500',
  },
}); 