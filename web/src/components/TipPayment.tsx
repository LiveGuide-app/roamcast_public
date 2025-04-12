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
  stripeAccountId: string;
}

// Amounts in currency units (not cents)
const tipAmounts = [5, 10, 15];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;

// Modal component for the Stripe checkout
const CheckoutModal = ({ 
  clientSecret, 
  stripePromise, 
  onClose, 
  onComplete 
}: { 
  clientSecret: string; 
  stripePromise: Promise<Stripe | null>; 
  onClose: () => void;
  onComplete: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Complete Payment</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              clientSecret,
              onComplete: () => {
                onComplete();
                onClose();
              },
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
};

const TipPaymentForm = forwardRef<{ handlePayment: () => Promise<void> }, TipPaymentProps>(
  ({ tourParticipantId, onAmountChange, onPaymentReady, onPaymentComplete, currency, stripePromise }, ref) => {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);

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
          // Show checkout modal
          setShowCheckout(true);
        } catch (error) {
          console.error('Payment failed:', error);
          setError(error instanceof Error ? error.message : 'Payment failed');
          throw error;
        } finally {
          setIsProcessing(false);
        }
      }
    }), [selectedAmount, tourParticipantId, currency]);

    const handleAmountSelect = async (amount: number | null) => {
      setSelectedAmount(amount);
      onAmountChange(amount);
      onPaymentReady(amount !== null);
    };

    const handleCustomAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.replace(/[^0-9.,]/g, '');
      // Replace comma with dot for consistency
      const normalizedValue = value.replace(',', '.');
      // Ensure only one decimal point
      const parts = normalizedValue.split('.');
      const formattedValue = parts.length > 2 ? `${parts[0]}.${parts[1]}` : normalizedValue;
      setCustomAmount(formattedValue);
      
      const amount = formattedValue ? parseFloat(formattedValue) : null;
      
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

    const handleCloseCheckout = () => {
      setShowCheckout(false);
      setClientSecret(null);
    };

    const handlePaymentComplete = () => {
      onPaymentComplete();
      handleCloseCheckout();
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {tipAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmountSelect(amount)}
                className={`py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200
                  ${selectedAmount === amount
                    ? 'bg-primary text-white'
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
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isProcessing}
            />
          </div>
          <button
            onClick={() => handleAmountSelect(null)}
            className={`w-full py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200
              ${selectedAmount === null && !customAmount
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
            disabled={isProcessing}
          >
            No tip
          </button>
        </div>

        {clientSecret && showCheckout && (
          <CheckoutModal
            clientSecret={clientSecret}
            stripePromise={stripePromise}
            onClose={handleCloseCheckout}
            onComplete={handlePaymentComplete}
          />
        )}

        {error && (
          <div className="p-4 bg-danger bg-opacity-10 text-danger rounded-md border border-danger border-opacity-20">
            {error}
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    );
  }
);

TipPaymentForm.displayName = 'TipPaymentForm';

export const TipPayment = forwardRef<{ handlePayment: () => Promise<void> }, TipPaymentProps>(
  (props, ref) => {
    if (!props.stripePromise) {
      return null;
    }

    return <TipPaymentForm ref={ref} {...props} />;
  }
);

TipPayment.displayName = 'TipPayment'; 