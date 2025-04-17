import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/services/device';
import { colors, borderRadius } from '@/config/theme';
import { formatCurrency } from '@/utils/currency';
import appLogger from '@/utils/appLogger';

export type TipPaymentHandle = {
  handlePayment: () => Promise<void>;
};

type TipPaymentProps = {
  tourParticipantId: string;
  onAmountChange: (amount: number | null) => void;
  onPaymentReady: (isReady: boolean) => void;
  onPaymentComplete: () => void;
  currency?: string;
};

interface FeeCalculation {
  tipAmount: number;
  processingFee: number;
  platformFee: number;
  totalAmount: number;
}

export const TipPayment = forwardRef<TipPaymentHandle, TipPaymentProps>(({ 
  tourParticipantId,
  onAmountChange,
  onPaymentReady,
  onPaymentComplete,
  currency = 'gbp'
}, ref) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [fees, setFees] = useState<FeeCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const MAX_TIP_AMOUNT = 10000; // 100 currency units in cents
  const predefinedAmounts = [500, 1000, 1500]; // £5, £10, £15 or $5, $10, $15

  useEffect(() => {
    // Signal that no amount is selected initially
    onAmountChange(null);
    onPaymentReady(false);
  }, []);

  // Calculate fees when amount changes
  useEffect(() => {
    const calculateFees = async () => {
      const amount = selectedAmount || (customAmount ? parseInt(customAmount, 10) * 100 : null);
      
      if (!amount || isNaN(amount) || amount <= 0) {
        setFees(null);
        onAmountChange(null);
        onPaymentReady(false);
        return;
      }

      setCalculating(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/calculate-fees`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ 
              amount, 
              currency 
            })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to calculate fees');
        }

        const data = await response.json();
        setFees(data);
        onAmountChange(amount);
        onPaymentReady(true);
      } catch (error) {
        console.error('Error calculating fees:', error);
        setError('Failed to calculate fees. Please try again.');
        onAmountChange(null);
        onPaymentReady(false);
      } finally {
        setCalculating(false);
      }
    };

    // Debounce the calculation to avoid too many API calls
    const timeoutId = setTimeout(() => {
      calculateFees();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedAmount, customAmount, currency, onAmountChange, onPaymentReady]);

  useImperativeHandle(ref, () => ({
    handlePayment: async () => {
      const amount = selectedAmount || (customAmount ? parseInt(customAmount, 10) * 100 : null);
      if (!amount) {
        // No tip selected, just complete
        onPaymentComplete();
        return;
      }

      if (!fees) {
        Alert.alert('Error', 'Please wait for fee calculation to complete');
        return;
      }

      try {
        setIsLoading(true);
        
        // Create payment intent
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-tip-payment`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              tourParticipantId,
              amount,
              currency
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Payment failed');
        }

        const data = await response.json();
        
        if (data.clientSecret) {
          // Initialize payment sheet
          await initializePaymentSheet(amount);
          
          // Present payment sheet
          const { error: presentError } = await presentPaymentSheet();
          
          if (presentError) {
            throw new Error(presentError.message);
          }
          
          // Payment successful
          onPaymentComplete();
        } else {
          throw new Error('Invalid response from payment service');
        }
      } catch (error) {
        console.error('Payment error:', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Payment failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  }));

  const handleAmountSelect = (amount: number | null) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers
    if (/^\d*$/.test(text)) {
      setCustomAmount(text);
      setSelectedAmount(null);
    }
  };

  const initializePaymentSheet = async (amount: number) => {
    try {
      // Get device ID for tracking
      const deviceId = await getDeviceId();
      
      // Create payment intent
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-create-checkout`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            tourParticipantId,
            amount,
            currency,
            deviceId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      
      if (!data.clientSecret) {
        throw new Error('No client secret returned');
      }

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Roamcast',
        paymentIntentClientSecret: data.clientSecret,
        defaultBillingDetails: {
          name: 'Guest',
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }
    } catch (error) {
      appLogger.logError('Error initializing payment sheet:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, currency);
  };

  const getCurrencySymbol = () => {
    return currency === 'gbp' ? '£' : currency === 'usd' ? '$' : '€';
  };

  return (
    <View style={styles.container}>
      <View style={styles.amountButtons}>
        {predefinedAmounts.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.amountButton,
              selectedAmount === amount && styles.selectedAmountButton
            ]}
            onPress={() => handleAmountSelect(amount)}
          >
            <Text style={[
              styles.amountButtonText,
              selectedAmount === amount && styles.selectedAmountButtonText
            ]}>
              {formatAmount(amount)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customAmountContainer}>
        <Text style={styles.customAmountLabel}>Custom Amount:</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
          <TextInput
            style={styles.input}
            value={customAmount}
            onChangeText={handleCustomAmountChange}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {calculating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.main} />
          <Text style={styles.loadingText}>Calculating fees...</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {fees && !calculating && (
        <View style={styles.feeBreakdown}>
          <Text style={styles.feeTitle}>Payment Breakdown</Text>
          <View style={styles.feeRow}>
            <Text>Tip Amount:</Text>
            <Text>{formatCurrency(fees.tipAmount, currency)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text>Processing Fee:</Text>
            <Text>{formatCurrency(fees.processingFee + fees.platformFee, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(fees.totalAmount, currency)}</Text>
          </View>
          <Text style={styles.notice}>
            Your guide will receive the full tip amount of {formatCurrency(fees.tipAmount, currency)}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  amountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountButton: {
    backgroundColor: colors.background.paper,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    width: '30%',
    alignItems: 'center',
  },
  selectedAmountButton: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  amountButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  selectedAmountButtonText: {
    color: colors.text.white,
    fontWeight: 'bold',
  },
  customAmountContainer: {
    marginBottom: 20,
  },
  customAmountLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    marginRight: 8,
    color: colors.text.primary,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 18,
    color: colors.text.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error.main,
    marginVertical: 12,
  },
  feeBreakdown: {
    padding: 16,
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  feeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 8,
  },
  totalText: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  notice: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
}); 