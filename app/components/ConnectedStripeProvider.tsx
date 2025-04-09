import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY, EXPO_PUBLIC_APP_URL_SCHEME } from '@env';

type ConnectedStripeProviderProps = {
  children: React.ReactNode;
  stripeAccountId: string;
};

export const ConnectedStripeProvider: React.FC<ConnectedStripeProviderProps> = ({ 
  children, 
  stripeAccountId 
}) => {
  if (!EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || !EXPO_PUBLIC_APP_URL_SCHEME) {
    console.error('Missing required Stripe configuration');
    return null;
  }

  // Create a scoped StripeProvider with the connected account ID
  return (
    <StripeProvider
      publishableKey={EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      urlScheme={EXPO_PUBLIC_APP_URL_SCHEME}
      stripeAccountId={stripeAccountId}
      merchantIdentifier="merchant.com.roamcast"
    >
      {children}
    </StripeProvider>
  );
}; 