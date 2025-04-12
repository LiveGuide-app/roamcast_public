import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { colors, spacing, borderRadius, shadows } from '../config/theme';
import { useRouter } from 'expo-router';
import { getTourByCode, createTourParticipant, TourError, getRecentTours, Tour } from '../services/tour';
import { getDeviceId } from '../services/device';
import { Button } from '@/components/Button';
import { useAuth } from '../components/auth/AuthContext';

export default function LandingScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tourCode, setTourCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [recentTours, setRecentTours] = useState<Tour[]>([]);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Set status bar for this screen
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(colors.primary.main);
    }
    StatusBar.setBarStyle('dark-content');

    // Reset status bar when component unmounts
    return () => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
      }
      StatusBar.setBarStyle('dark-content');
    };
  }, []);

  useEffect(() => {
    async function loadRecentTours() {
      try {
        const deviceId = await getDeviceId();
        const tours = await getRecentTours(deviceId);
        setRecentTours(tours);
      } catch (error) {
        console.error('Error loading recent tours:', error);
      }
    }
    loadRecentTours();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digits
    const newCode = [...tourCode];
    newCode[index] = value;
    setTourCode(newCode);

    // Auto-advance to next field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleJoinTour = async () => {
    const code = tourCode.join('');
    if (!code || code.length !== 6) return;
    
    setIsLoading(true);
    try {
      const tour = await getTourByCode(code);
      if (tour.status === 'cancelled') {
        Alert.alert('Tour Cancelled', 'This tour has been cancelled by the guide.');
        return;
      }
      if (tour.status === 'completed') {
        router.push(`/(tour)/${code}`);
        return;
      }

      // Get the device ID
      const deviceId = await getDeviceId();
      
      // Create tour participant entry
      await createTourParticipant(tour.id, deviceId);
      
      router.push(`/(tour)/${code}`);
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
    if (authLoading) return; // Don't navigate while auth is loading
    if (user) {
      router.push('/(tabs)/tours');
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary.main }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.logo}
            />
            <Text style={styles.title}>Roamcast</Text>
            <Text style={styles.subtitle}>Immersive Audio Experiences</Text>
          </View>

          {/* Join Tour Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join a Tour</Text>
            <Text style={styles.sectionSubtitle}>Enter the 6-digit code provided by your tour guide</Text>
            
            <View style={styles.codeInputContainer}>
              {tourCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <Button
              title={isLoading ? 'Joining...' : 'Join Tour'}
              onPress={handleJoinTour}
              disabled={!tourCode.every(digit => digit) || isLoading}
              variant="primary"
            />
          </View>

          {/* Recent Tours Section */}
          {recentTours.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Active Tours</Text>
              {recentTours.map((tour) => (
                <TouchableOpacity 
                  key={tour.id} 
                  style={styles.tourCard}
                  onPress={() => router.push(`/(tour)/${tour.unique_code}`)}
                >
                  <View style={styles.tourInfo}>
                    <Text style={styles.tourName}>{tour.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tour.status) }]}>
                      <Text style={styles.statusText}>{tour.status}</Text>
                    </View>
                  </View>
 
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Guide Login Section */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Are you a tour guide?</Text>
          <TouchableOpacity onPress={handleGuideLogin}>
            <Text style={styles.link}>Log in to your account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return colors.error.main;
    case 'pending':
      return colors.warning.main;
    case 'completed':
      return colors.success.main;
    default:
      return colors.text.secondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.white,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.white,
    textAlign: 'center',
  },
  section: {
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.md,
    fontSize: 24,
    textAlign: 'center',
    color: colors.text.primary,
    backgroundColor: colors.background.paper,
    ...shadows.small,
  },
  tourCard: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  tourInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tourName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tourDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background.default,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  link: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
