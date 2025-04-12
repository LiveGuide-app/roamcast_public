import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { colors, spacing, borderRadius } from '@/config/theme';
import { createTour } from '@/services/tour';
import { validateTourName } from '@/utils/validation';
import { handleTourError } from '@/utils/error-handling';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(guide)/(tabs)/tours')} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Tour</Text>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Tour Name</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError(null);
              }}
              placeholder="Historic Downtown Tour"
              placeholderTextColor={colors.text.secondary}
              editable={!isLoading}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.footer}>
            <Button 
              title={isLoading ? 'Creating...' : 'Create Tour'}
              onPress={handleCreateTour}
              disabled={isLoading}
            />
          </View>
        </View>
      </View>
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
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  headerTitle: {
    color: colors.text.white,
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    marginLeft: -spacing.sm,
  },
  backButtonText: {
    color: colors.text.white,
    fontSize: 24,
    fontWeight: '400',
  },
  contentContainer: {
    flex: 1,
    marginTop: spacing.xl,
  },
  inputContainer: {
    marginHorizontal: spacing.md,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.text.secondary,
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
  footer: {
    padding: spacing.lg,
    marginTop: 'auto',
  },
});
