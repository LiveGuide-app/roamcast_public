import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../components/auth/AuthContext';
import { validatePassword, validatePasswordConfirmation, ValidationError } from '../../utils/validation';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrors([]);
    
    // Validate password
    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = validatePasswordConfirmation(password, confirmPassword);
    
    if (!passwordValidation.isValid || !confirmPasswordValidation.isValid) {
      setErrors([
        ...passwordValidation.errors,
        ...confirmPasswordValidation.errors
      ]);
      return;
    }

    try {
      setLoading(true);
      const { error } = await updatePassword(password);
      
      if (error) {
        setErrors([{ field: 'general', message: error.message }]);
      } else {
        // Password updated successfully, redirect to login
        router.replace('/(auth)/login');
      }
    } catch (error) {
      setErrors([{ field: 'general', message: 'An unexpected error occurred' }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>Create a new password for your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={[styles.input, getFieldError('password') ? styles.inputError : null]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors(errors.filter(error => error.field !== 'password'));
              }}
              placeholder="Enter new password"
              placeholderTextColor={colors.text.secondary}
              secureTextEntry
            />
            {getFieldError('password') && (
              <Text style={styles.errorText}>{getFieldError('password')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, getFieldError('confirmPassword') ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors(errors.filter(error => error.field !== 'confirmPassword'));
              }}
              placeholder="Confirm new password"
              placeholderTextColor={colors.text.secondary}
              secureTextEntry
            />
            {getFieldError('confirmPassword') && (
              <Text style={styles.errorText}>{getFieldError('confirmPassword')}</Text>
            )}
          </View>

          {getFieldError('general') && (
            <Text style={styles.generalError}>{getFieldError('general')}</Text>
          )}

          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, loading && styles.disabledButton]} 
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            <View style={styles.signupContainer}>
              <Text style={styles.footerText}>Remember your password?{' '}</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.link}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
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
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    ...shadows.small,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  generalError: {
    color: colors.error.main,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.small,
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  links: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  link: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
