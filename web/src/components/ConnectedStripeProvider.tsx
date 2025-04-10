import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ReactNode } from 'react';
import type { Appearance } from '@stripe/stripe-js';

interface ConnectedStripeProviderProps {
  stripeAccountId: string;
  children: ReactNode;
}

const appearance: Appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#2563eb',
    colorBackground: '#ffffff',
    colorText: '#1f2937',
    colorDanger: '#dc2626',
    fontFamily: 'Inter var, sans-serif',
    borderRadius: '0.5rem',
    spacingUnit: '4px',
  },
};

export function ConnectedStripeProvider({ stripeAccountId, children }: ConnectedStripeProviderProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error('Missing Stripe publishable key');
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Payment system is currently unavailable. Please try again later.
      </div>
    );
  }

  // Initialize Stripe with your publishable key and the connected account ID
  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, {
    stripeAccount: stripeAccountId,
  });

  if (!stripeAccountId) {
    console.error('Missing Stripe connected account ID');
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Payment system is currently unavailable. Please try again later.
      </div>
    );
  }

  return (
    <Elements 
      stripe={stripePromise}
      options={{
        appearance,
        locale: 'en',
      }}
    >
      {children}
    </Elements>
  );
} 