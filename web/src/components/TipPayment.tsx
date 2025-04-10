import { useState, forwardRef, useImperativeHandle } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';

interface TipPaymentProps {
  tourParticipantId: string;
  onAmountChange: (amount: number | null) => void;
  onPaymentReady: (ready: boolean) => void;
  onPaymentComplete: () => void;
  currency: string;
}

export interface TipPaymentHandle {
  handlePayment: () => Promise<void>;
}

const tipAmounts = [5, 10, 20];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;

export const TipPayment = forwardRef<TipPaymentHandle, TipPaymentProps>(
  ({ tourParticipantId, onAmountChange, onPaymentReady, onPaymentComplete, currency }, ref) => {
    const stripe = useStripe();
    const elements = useElements();
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardComplete, setCardComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      handlePayment: async () => {
        if (!stripe || !elements || !selectedAmount) {
          setError('Payment system is not ready. Please try again.');
          return;
        }

        if (selectedAmount < MIN_AMOUNT || selectedAmount > MAX_AMOUNT) {
          setError(`Amount must be between ${formatAmount(MIN_AMOUNT)} and ${formatAmount(MAX_AMOUNT)}`);
          return;
        }

        try {
          setError(null);
          setIsProcessing(true);

          // Create payment intent
          const { data: intent, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
            body: {
              amount: Math.round(selectedAmount * 100), // Convert to cents
              currency: currency.toLowerCase(),
              tourParticipantId
            }
          });

          if (intentError) throw intentError;

          // Confirm card payment
          const { error: stripeError } = await stripe.confirmCardPayment(intent.clientSecret, {
            payment_method: {
              card: elements.getElement(CardElement)!,
            }
          });

          if (stripeError) {
            if (stripeError.type === 'card_error' || stripeError.type === 'validation_error') {
              setError(stripeError.message || 'An error occurred with your card.');
            } else {
              setError('An unexpected error occurred.');
            }
            return;
          }

          onPaymentComplete();
          setSelectedAmount(null);
          setCustomAmount('');
          setCardComplete(false);
        } catch (error) {
          console.error('Payment failed:', error);
          setError('Payment failed. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }
    }));

    const handleAmountSelect = (amount: number | null) => {
      setError(null);
      setSelectedAmount(amount);
      setCustomAmount('');
      onAmountChange(amount);
    };

    const handleCustomAmountChange = (value: string) => {
      setError(null);
      const numericValue = value.replace(/[^0-9.]/g, '');
      const amount = parseFloat(numericValue);
      
      setCustomAmount(numericValue);
      
      if (isNaN(amount)) {
        setSelectedAmount(null);
        onAmountChange(null);
        return;
      }

      if (amount < MIN_AMOUNT) {
        setError(`Minimum amount is ${formatAmount(MIN_AMOUNT)}`);
        setSelectedAmount(null);
        onAmountChange(null);
        return;
      }

      if (amount > MAX_AMOUNT) {
        setError(`Maximum amount is ${formatAmount(MAX_AMOUNT)}`);
        setSelectedAmount(null);
        onAmountChange(null);
        return;
      }

      setSelectedAmount(amount);
      onAmountChange(amount);
    };

    const handleCardChange = (event: any) => {
      setError(event.error ? event.error.message : null);
      setCardComplete(event.complete);
      onPaymentReady(event.complete);
    };

    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(amount);
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-center space-x-2">
          {tipAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleAmountSelect(amount)}
              className={`px-4 py-2 rounded-md transition-colors duration-200 
                ${selectedAmount === amount 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              disabled={isProcessing}
            >
              {formatAmount(amount)}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            placeholder={`Enter amount (min ${formatAmount(MIN_AMOUNT)})`}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing}
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {currency.toUpperCase()}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {selectedAmount !== null && selectedAmount > 0 && (
          <div className="space-y-4">
            <div className={`p-4 border rounded-md ${cardComplete ? 'border-green-500' : 'border-gray-300'}`}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                  hidePostalCode: true,
                }}
                onChange={handleCardChange}
              />
            </div>
            
            {isProcessing && (
              <div className="flex justify-center items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                <span className="text-sm">Processing payment...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
); 