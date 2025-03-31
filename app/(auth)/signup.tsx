import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { colors, spacing, borderRadius, shadows } from '../../config/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../components/auth/AuthContext';
import { validateSignupForm, ValidationError } from '../../utils/validation';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleSignup = async () => {
    // Clear previous errors
    setErrors([]);
    
    // Validate form
    const validation = validateSignupForm(name, email, password, confirmPassword);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      const { error } = await signUp(email, password, name);
      
      if (error) {
        setErrors([{ field: 'general', message: error.message }]);
      } else {
        router.push('/(auth)/verify-email');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to become a tour guide</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, getFieldError('name') && styles.inputError]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors(errors.filter(error => error.field !== 'name'));
              }}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {getFieldError('name') && (
              <Text style={styles.errorText}>{getFieldError('name')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, getFieldError('email') && styles.inputError]}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, getFieldError('password') && styles.inputError]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors(errors.filter(error => error.field !== 'password'));
              }}
              placeholder="Create a password"
              placeholderTextColor={colors.text.secondary}
              secureTextEntry
            />
            {getFieldError('password') && (
              <Text style={styles.errorText}>{getFieldError('password')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, getFieldError('confirmPassword') && styles.inputError]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors(errors.filter(error => error.field !== 'confirmPassword'));
              }}
              placeholder="Confirm your password"
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
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.links}>
            <View style={styles.signupContainer}>
              <Text style={styles.footerText}>Already have an account?{' '}</Text>
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
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
