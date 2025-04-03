import { Stack } from 'expo-router';
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

enableScreens();

// Debug component to show errors
const DebugError = ({ error }: { error: Error }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ color: 'red', fontSize: 16 }}>Error: {error.message}</Text>
  </View>
);

export default function RootLayout() {
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
        console.error('Error initializing LiveKit:', error);
      }
    };

    initializeLiveKit();

    // Cleanup audio session
    return () => {
      if (Platform.OS === 'android') {
        AudioSession.stopAudioSession().catch(error => {
          console.error('Error stopping audio session:', error);
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
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="(auth)" 
                options={{ headerShown: false }} 
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