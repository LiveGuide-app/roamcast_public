import React, { useState } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { useAuth } from '@/components/auth/AuthContext';

interface ChangeCredentialsModalProps {
  isVisible: boolean;
  onClose: () => void;
  type: 'password' | 'email';
}

export const ChangeCredentialsModal: React.FC<ChangeCredentialsModalProps> = ({
  isVisible,
  onClose,
  type,
}) => {
  const { updatePassword, updateEmail, user } = useAuth();
  const [newValue, setNewValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newValue || (type === 'password' && !confirmValue)) {
      Alert.alert('Error', `Please fill in all fields`);
      return;
    }

    if (type === 'password' && newValue !== confirmValue) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (type === 'email' && !newValue.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const { error } = await (type === 'password' 
        ? updatePassword(newValue)
        : updateEmail(newValue)
      );

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success', 
        type === 'password' 
          ? 'Password updated successfully'
          : 'Email update initiated. Please check your new email for verification.'
      );
      onClose();
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewValue('');
    setConfirmValue('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {type === 'password' ? 'Change Password' : 'Change Email'}
          </Text>
          
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {type === 'password' ? 'New Password' : 'New Email'}
              </Text>
              <TextInput
                style={styles.input}
                value={newValue}
                onChangeText={setNewValue}
                placeholder={type === 'password' ? 'Enter new password' : 'Enter new email'}
                placeholderTextColor={colors.text.secondary}
                secureTextEntry={type === 'password'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {type === 'password' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmValue}
                  onChangeText={setConfirmValue}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.text.secondary}
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={handleClose}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.submitButton]} 
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    ...shadows.medium,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.background.default,
  },
  submitButton: {
    backgroundColor: colors.primary.main,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: colors.text.primary,
  },
}); 