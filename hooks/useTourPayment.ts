import { useState, useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/services/device';
import { Alert } from 'react-native';

export type TipAmount = 500 | 1000 | 2000 | 5000;

export type UseTourPaymentReturn = {
  isPaymentReady: boolean;
  isLoading: boolean;
  error: Error | null;
  initializePayment: (tourParticipantId: string) => Promise<void>;
  handleTip: (tourParticipantId: string, amount: TipAmount) => Promise<void>;
};

export const useTourPayment = (): UseTourPaymentReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const initializePayment = useCallback(async (tourParticipantId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!tourParticipantId) {
        throw new Error('Tour participant not found');
      }

      const deviceId = await getDeviceId();
      
      // Create payment intent using Supabase client
      const { data, error: supabaseError } = await supabase.functions.invoke('stripe-tip-payment', {
        body: {
          tourParticipantId,
          amount: 1000, // Default amount, will be updated when user selects tip
          currency: 'gbp',
          deviceId,
        },
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const { paymentIntent } = data;

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Roamcast',
        paymentIntentClientSecret: paymentIntent,
        // Allow delayed payment methods like US bank accounts
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: 'Guest',
        },
      });

      if (initError) {
        throw initError;
      }

      setIsPaymentReady(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize payment'));
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initialize payment'
      );
    } finally {
      setIsLoading(false);
    }
  }, [initPaymentSheet]);

  const handleTip = useCallback(async (tourParticipantId: string, amount: TipAmount) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!tourParticipantId) {
        throw new Error('Tour participant not found');
      }

      const deviceId = await getDeviceId();
      
      // Update payment intent with selected amount
      const { data, error: supabaseError } = await supabase.functions.invoke('stripe-tip-payment', {
        body: {
          tourParticipantId,
          amount,
          currency: 'gbp',
          deviceId,
        },
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const { paymentIntent } = data;

      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          // User canceled the payment
          return;
        }
        throw paymentError;
      }

      // Payment successful
      Alert.alert('Success', 'Thank you for your tip!');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Payment failed'));
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong'
      );
    } finally {
      setIsLoading(false);
    }
  }, [presentPaymentSheet]);

  return {
    isPaymentReady,
    isLoading,
    error,
    initializePayment,
    handleTip,
  };
}; 