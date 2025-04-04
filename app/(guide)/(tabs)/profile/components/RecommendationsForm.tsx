import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';

interface RecommendationsFormProps {
  onSave: (password: string) => void;
}

export const RecommendationsForm: React.FC<RecommendationsFormProps> = ({
  onSave,
}) => {
  const [password, setPassword] = useState('');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommendations</Text>
      <Text style={styles.sectionDescription}>
        You can add a link to a document such as a google sheet or pdf with recommendations that will be shown to your guests after the tour
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={() => onSave(password)}
      >
        <Text style={styles.saveButtonText}>Save</Text>
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
  },
  saveButtonText: {
    color: '#008080',
    fontSize: 16,
    fontWeight: '500',
  },
}); 