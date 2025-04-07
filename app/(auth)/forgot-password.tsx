import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../components/auth/AuthContext';
import { validateEmail, ValidationError } from '../../utils/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrors([]);
    
    // Validate email
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      const { error } = await resetPassword(email);
      
      if (error) {
        setErrors([{ field: 'general', message: error.message }]);
      } else {
        setSuccess(true);
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a password reset link</Text>
        </View>

        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              If an account exists with the email {email}, you will receive a password reset link shortly.
            </Text>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, getFieldError('email') ? styles.inputError : null]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors(errors.filter(error => error.field !== 'email'));
                }}
                placeholder="Enter your email"
                placeholderTextColor={colors.text.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {getFieldError('email') && (
                <Text style={styles.errorText}>{getFieldError('email')}</Text>
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
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <View style={styles.links}>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.link}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  successContainer: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
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
});
