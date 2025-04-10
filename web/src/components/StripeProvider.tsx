'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ReactNode } from 'react';
import type { Appearance } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

export function StripeProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error('Missing Stripe publishable key');
    return null;
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