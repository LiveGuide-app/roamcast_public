import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabase';
import { DeviceIdService } from '@/services/deviceId';

interface TipPaymentProps {
  tourParticipantId: string;
  onAmountChange: (amount: number | null) => void;
  onPaymentReady: (ready: boolean) => void;
  onPaymentComplete: () => void;
  currency: string;
  stripePromise: Promise<Stripe | null>;
}

// Amounts in currency units (not cents)
const tipAmounts = [5, 10, 20, 50];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;

// Helper to detect if we're on a mobile device
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const TipPaymentForm = forwardRef<{ handlePayment: () => Promise<void> }, TipPaymentProps>(
  ({ tourParticipantId, onAmountChange, onPaymentReady, onPaymentComplete, currency, stripePromise }, ref) => {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const isMobile = isMobileDevice();

    // Handle return from checkout
    useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get('session_id');
      
      if (sessionId) {
        // Clear the URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Notify completion
        onPaymentComplete();
      }
    }, [onPaymentComplete]);

    useImperativeHandle(ref, () => ({
      handlePayment: async () => {
        if (!selectedAmount) {
          throw new Error('Payment cannot be processed at this time');
        }

        setIsProcessing(true);
        setError(null);
        
        try {
          // Get device ID
          const deviceId = await DeviceIdService.getDatabaseId();
          
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('stripe-create-checkout', {
            body: {
              tourParticipantId,
              amount: selectedAmount * 100, // Convert to cents for Stripe
              currency: currency.toLowerCase(),
              deviceId,
            },
          });

          if (checkoutError) {
            setError(checkoutError.message);
            throw checkoutError;
          }
          
          if (!checkoutData?.clientSecret) {
            setError('No client secret returned');
            throw new Error('No client secret returned');
          }

          // Set client secret to show checkout
          setClientSecret(checkoutData.clientSecret);
        } catch (error) {
          console.error('Payment failed:', error);
          setError(error instanceof Error ? error.message : 'Payment failed');
          throw error;
        } finally {
          setIsProcessing(false);
        }
      }
    }), [selectedAmount, tourParticipantId, currency]);

    const handleAmountSelect = async (amount: number) => {
      try {
        setSelectedAmount(amount);
        onAmountChange(amount);
        onPaymentReady(true);
      } catch (error) {
        console.error('Error handling amount selection:', error);
        setSelectedAmount(null);
        onAmountChange(null);
        onPaymentReady(false);
      }
    };

    const handleCustomAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.replace(/[^0-9]/g, '');
      setCustomAmount(value);
      const amount = value ? parseInt(value, 10) : null;
      
      if (amount && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT) {
        setSelectedAmount(amount);
        onAmountChange(amount);
        onPaymentReady(true);
      } else {
        setSelectedAmount(null);
        onAmountChange(null);
        onPaymentReady(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {tipAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmountSelect(amount)}
                className={`py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
                  ${selectedAmount === amount
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                disabled={isProcessing}
              >
                {new Intl.NumberFormat('en-GB', {
                  style: 'currency',
                  currency: currency.toUpperCase(),
                }).format(amount)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder="Custom amount"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
          </div>
        </div>

        {clientSecret && (
          <div id="checkout" className="mt-4">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: () => {
                  onPaymentComplete();
                },
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    );
  }
);

export const TipPayment = forwardRef<{ handlePayment: () => Promise<void> }, TipPaymentProps>(
  (props, ref) => {
    if (!props.stripePromise) {
      return null;
    }

    return <TipPaymentForm ref={ref} {...props} />;
  }
);

TipPayment.displayName = 'TipPayment';
TipPaymentForm.displayName = 'TipPaymentForm'; 