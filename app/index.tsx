import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { colors, spacing, borderRadius, shadows } from '../config/theme';
import { useRouter } from 'expo-router';
import { getTourByCode, createTourParticipant, TourError } from '../services/tour';
import { getDeviceId } from '../services/device';

export default function LandingScreen() {
  const router = useRouter();
  const [tourCode, setTourCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinTour = async () => {
    if (!tourCode) return;
    
    setIsLoading(true);
    try {
      const tour = await getTourByCode(tourCode);
      if (tour.status === 'cancelled') {
        Alert.alert('Tour Cancelled', 'This tour has been cancelled by the guide.');
        return;
      }
      if (tour.status === 'completed') {
        router.push(`/(tour)/${tourCode}`);
        return;
      }

      // Get the device ID
      const deviceId = await getDeviceId();
      
      // Create tour participant entry
      await createTourParticipant(tour.id, deviceId);
      
      router.push(`/(tour)/${tourCode}`);
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to join tour');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuideLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>RoamCast</Text>
          <Text style={styles.subtitle}>Join your tour guide's live audio stream</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter Tour Code</Text>
          <TextInput
            style={styles.input}
            value={tourCode}
            onChangeText={setTourCode}
            placeholder="e.g. 893123"
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <TouchableOpacity 
            style={[
              styles.button,
              styles.primaryButton,
              (!tourCode || isLoading) && styles.disabledButton
            ]} 
            onPress={handleJoinTour}
            disabled={!tourCode || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Joining...' : 'Join Tour'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Are you a tour guide?{' '}
            <Text style={styles.link} onPress={handleGuideLogin}>
              Login here
            </Text>
          </Text>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
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
  inputContainer: {
    width: '100%',
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
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  button: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
  },
  disabledButton: {
    backgroundColor: colors.primary.light,
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  link: {
    color: colors.primary.main,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
