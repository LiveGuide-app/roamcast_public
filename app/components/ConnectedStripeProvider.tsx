import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

type ConnectedStripeProviderProps = {
  children: React.ReactNode;
  stripeAccountId: string;
};

export const ConnectedStripeProvider: React.FC<ConnectedStripeProviderProps> = ({ 
  children, 
  stripeAccountId 
}) => {
  const stripeKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const urlScheme = Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_URL_SCHEME;

  if (!stripeKey || !urlScheme) {
    console.error('Missing required Stripe configuration');
    return null;
  }

  // Create a scoped StripeProvider with the connected account ID
  return (
    <StripeProvider
      publishableKey={stripeKey}
      urlScheme={urlScheme}
      stripeAccountId={stripeAccountId}
    >
      {children}
    </StripeProvider>
  );
}; 