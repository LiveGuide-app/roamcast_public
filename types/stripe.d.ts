declare module '@stripe/stripe-react-native' {
  export interface StripeProviderProps {
    publishableKey: string;
    urlScheme: string;
    stripeAccountId?: string;
    merchantIdentifier?: string;
    googlePay?: {
      merchantCountryCode: string;
      testEnv?: boolean;
    };
    children: React.ReactNode;
  }

  export const StripeProvider: React.FC<StripeProviderProps>;
  export const useStripe: () => any;
} 