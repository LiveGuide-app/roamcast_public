import { Stack } from 'expo-router';
import { AuthProvider } from '../components/auth/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { registerGlobals } from '@livekit/react-native';
import { useEffect } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { View, Text } from 'react-native';

enableScreens();

// Debug component to show errors
const DebugError = ({ error }: { error: Error }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ color: 'red', fontSize: 16 }}>Error: {error.message}</Text>
  </View>
);

export default function RootLayout() {
  useEffect(() => {
    try {
      registerGlobals();
    } catch (error) {
      console.error('Error registering LiveKit globals:', error);
    }
  }, []);

  const stripeKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const urlScheme = Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_URL_SCHEME;

  if (!stripeKey || !urlScheme) {
    return <DebugError error={new Error('Missing required environment variables')} />;
  }

  return (
    <SafeAreaProvider>
      <StripeProvider 
        publishableKey={stripeKey}
        urlScheme={urlScheme}
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