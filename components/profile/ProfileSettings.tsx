import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@/config/theme';

interface ProfileSettingsProps {
  onChangePassword: () => void;
  onChangeEmail: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  onChangePassword,
  onChangeEmail,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Settings</Text>
      <TouchableOpacity 
        style={styles.settingButton}
        onPress={onChangePassword}
      >
        <Text style={styles.settingButtonText}>Change Password</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.settingButton}
        onPress={onChangeEmail}
      >
        <Text style={styles.settingButtonText}>Change Email</Text>
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
  settingButton: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
}); 