import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance, type StripeElementsOptions } from '@stripe/stripe-js';
import { ReactNode, useMemo } from 'react';

interface ConnectedStripeProviderProps {
  stripeAccountId: string;
  children: ReactNode;
  clientSecret?: string;
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
  rules: {
    '.Input': {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    '.Input:focus': {
      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.5)',
      border: '1px solid #2563eb',
    },
    '.Tab': {
      padding: '10px 12px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    '.Tab:hover': {
      color: '#2563eb',
      border: '1px solid #2563eb',
    },
    '.Tab--selected': {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      border: '1px solid #2563eb',
    },
  },
};

export function ConnectedStripeProvider({ 
  stripeAccountId, 
  children,
  clientSecret 
}: ConnectedStripeProviderProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error('Missing Stripe publishable key');
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Payment system is currently unavailable. Please try again later.
      </div>
    );
  }

  if (!stripeAccountId) {
    console.error('Missing Stripe connected account ID');
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Payment system is currently unavailable. Please try again later.
      </div>
    );
  }

  // Memoize the stripe instance
  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
      stripeAccount: stripeAccountId,
    }),
    [stripeAccountId]
  );

  const options: StripeElementsOptions = {
    appearance,
    locale: 'en',
    clientSecret: clientSecret || undefined
  };

  return (
    <Elements 
      stripe={stripePromise}
      options={options}
    >
      {children}
    </Elements>
  );
} 