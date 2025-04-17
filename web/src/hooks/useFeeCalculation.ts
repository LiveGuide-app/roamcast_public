import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FeeCalculation {
  tipAmount: number;
  processingFee: number;
  platformFee: number;
  totalAmount: number;
}

export function useFeeCalculation(amount: number | null, currency: string) {
  const [fees, setFees] = useState<FeeCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const calculateFees = async () => {
      if (!amount) {
        setFees(null);
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        const { data, error: feeError } = await supabase.functions.invoke('calculate-fees', {
          body: {
            amount: amount * 100, // Convert to cents for the API
            currency: currency.toLowerCase(),
          },
        });

        if (feeError) {
          throw feeError;
        }

        if (isMounted) {
          setFees(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to calculate fees');
          setFees(null);
        }
      } finally {
        if (isMounted) {
          setIsCalculating(false);
        }
      }
    };

    // Debounce the fee calculation
    const timeoutId = setTimeout(calculateFees, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [amount, currency]);

  return { fees, isCalculating, error };
} 