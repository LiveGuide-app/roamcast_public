import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { createTour } from '@/services/tour';
import { validateTourName } from '@/utils/validation';
import { handleTourError } from '@/utils/error-handling';

export default function CreateTour() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTour = async () => {
    const validationError = validateTourName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      const tour = await createTour({ name, status: 'pending' });
      
      router.push({
        pathname: '/(guide)/[tourId]',
        params: { tourId: tour.id }
      });
    } catch (error) {
      Alert.alert('Error', handleTourError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tour Name</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="Enter tour name"
            placeholderTextColor={colors.text.secondary}
            editable={!isLoading}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]} 
          onPress={handleCreateTour}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating...' : 'Create Tour'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  form: {
    padding: spacing.lg,
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
    padding: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    ...shadows.small,
  },
  inputError: {
    borderColor: colors.error.main,
    borderWidth: 1,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 12,
    marginTop: spacing.xs,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
