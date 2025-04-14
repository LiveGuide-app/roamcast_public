import { Stack, usePathname } from 'expo-router';
import { AuthProvider } from '../components/auth/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { registerGlobals, AudioSession } from '@livekit/react-native';
import * as LiveKit from '@livekit/react-native';
import { useEffect } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { View, Text, Platform } from 'react-native';
import { EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY, EXPO_PUBLIC_APP_URL_SCHEME } from '@env';
import appLogger from '@/utils/appLogger';

enableScreens();

// Debug component to show errors
const DebugError = ({ error }: { error: Error }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ color: 'red', fontSize: 16 }}>Error: {error.message}</Text>
  </View>
);

export default function RootLayout() {
  const pathname = usePathname();

  // Get the current auth screen title
  const getAuthTitle = () => {
    if (pathname.includes('signup')) return 'Sign Up';
    if (pathname.includes('reset-password')) return 'Reset Password';
    return 'Sign In';
  };

  useEffect(() => {
    const initializeLiveKit = async () => {
      try {
        // Register LiveKit globals
        registerGlobals();
        
        // Initialize audio session for Android
        if (Platform.OS === 'android') {
          await AudioSession.startAudioSession();
        }
      } catch (error) {
        appLogger.logError('Error initializing LiveKit:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeLiveKit();

    // Cleanup audio session
    return () => {
      if (Platform.OS === 'android') {
        AudioSession.stopAudioSession().catch(error => {
          appLogger.logError('Error stopping audio session:', error instanceof Error ? error : new Error(String(error)));
        });
      }
    };
  }, []);

  if (!EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || !EXPO_PUBLIC_APP_URL_SCHEME) {
    return <DebugError error={new Error('Missing required environment variables')} />;
  }

  return (
    <SafeAreaProvider>
      <StripeProvider 
        publishableKey={EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        urlScheme={EXPO_PUBLIC_APP_URL_SCHEME}
      >
        <AuthProvider>
          <ProtectedRoute>
            <Stack>
              <Stack.Screen 
                name="index" 
                options={{ 
                  headerShown: false,
                  title: "Home"
                }} 
              />
              <Stack.Screen 
                name="(auth)" 
                options={{
                  headerShown: true,
                  headerStyle: { backgroundColor: '#fff' },
                  headerTintColor: '#000',
                  headerTitleStyle: { fontWeight: 'bold' },
                  title: getAuthTitle()
                }} 
              />
              <Stack.Screen 
                name="(guide)" 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="(tour)" 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="(stripe)" 
                options={{ headerShown: false }} 
              />
            </Stack>
          </ProtectedRoute>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
} 