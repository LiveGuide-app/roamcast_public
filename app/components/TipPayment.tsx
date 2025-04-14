import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const MAX_TIP_AMOUNT = 10000; // 100 currency units in cents
  const predefinedAmounts = [500, 1000, 1500]; // £5, £10, £15 or $5, $10, $15

  useEffect(() => {
    // Signal that no amount is selected initially
    onAmountChange(null);
    onPaymentReady(false);
  }, []);

  useImperativeHandle(ref, () => ({
    handlePayment: async () => {
      const amount = selectedAmount || (customAmount ? parseInt(customAmount, 10) * 100 : null);
      if (!amount) {
        // No tip selected, just complete
        onPaymentComplete();
        return;
      }

      try {
        setIsLoading(true);
        // Initialize payment sheet first
        const isInitialized = await initializePaymentSheet(amount);
        if (!isInitialized) {
          return;
        }

        // Present payment sheet
        const { error: presentError } = await presentPaymentSheet();
        
        if (presentError) {
          if (presentError.code === 'Canceled') {
            return;
          }
          throw presentError;
        }

        // Payment successful
        onPaymentComplete();
        
        // Reset form
        setSelectedAmount(null);
        setCustomAmount('');
        onAmountChange(null);
      } catch (err) {
        appLogger.logError('Payment error:', err instanceof Error ? err : new Error(String(err)));
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Payment failed'
        );
      } finally {
        setIsLoading(false);
      }
    }
  }));

  const handleAmountSelect = (amount: number | null) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    onAmountChange(amount);
    // Signal payment readiness
    onPaymentReady(amount !== null);
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
    const amount = numericValue ? parseInt(numericValue, 10) * 100 : null; // Convert to cents
    
    if (amount && amount > MAX_TIP_AMOUNT) {
      Alert.alert('Invalid Amount', `Maximum tip amount is ${formatCurrency(MAX_TIP_AMOUNT / 100, currency)}`);
      setCustomAmount('');
      onAmountChange(null);
      onPaymentReady(false);
    } else {
      onAmountChange(amount);
      onPaymentReady(!!amount);
    }
  };

  const initializePaymentSheet = async (amount: number) => {
    try {
      const deviceId = await getDeviceId();

      // Create payment intent
      const { data, error: supabaseError } = await supabase.functions.invoke('stripe-tip-payment', {
        body: {
          tourParticipantId,
          amount,
          currency,
          deviceId,
        },
      });

      if (supabaseError) {
        appLogger.logError('Supabase error:', supabaseError instanceof Error ? supabaseError : new Error(String(supabaseError)));
        throw new Error(supabaseError.message);
      }

      const { 
        paymentIntent: paymentIntentClientSecret
      } = data;

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Roamcast',
        paymentIntentClientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'roamcast://stripe/return',
        defaultBillingDetails: {
          name: 'Guest',
        },
        applePay: {
          merchantCountryCode: 'GB',
        },
        googlePay: {
          merchantCountryCode: 'GB',
          testEnv: true,
        },
      });

      if (initError) {
        appLogger.logError('Init payment sheet error:', initError instanceof Error ? initError : new Error(String(initError)));
        throw initError;
      }

      return true;
    } catch (err) {
      appLogger.logError('Payment initialization error:', err instanceof Error ? err : new Error(String(err)));
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initialize payment'
      );
      return false;
    }
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, currency);
  };

  const getCurrencySymbol = () => {
    return formatCurrency(0, currency).replace(/[\d,]/g, '');
  };

  return (
    <View style={styles.container}>
      <View style={styles.amountContainer}>
        {predefinedAmounts.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.amountButton,
              selectedAmount === amount && styles.selectedButton,
            ]}
            onPress={() => handleAmountSelect(amount)}
            disabled={isLoading}
          >
            <Text style={[
              styles.amountText,
              selectedAmount === amount && styles.selectedText,
            ]}>
              {formatAmount(amount)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customAmountContainer}>
        <Text style={styles.label}>Custom Amount</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currencySymbol}>
            {getCurrencySymbol()}
          </Text>
          <TextInput
            style={styles.input}
            value={customAmount}
            onChangeText={handleCustomAmountChange}
            placeholder="0"
            keyboardType="numeric"
            maxLength={6}
            editable={!isLoading}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.noTipButton,
          selectedAmount === null && !customAmount && styles.noTipButtonUnselected,
        ]}
        onPress={() => handleAmountSelect(null)}
        disabled={isLoading}
      >
        <Text style={[
          styles.noTipText,
          selectedAmount === null && !customAmount && styles.noTipTextUnselected,
        ]}>
          No tip
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  amountButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.paper,
  },
  selectedButton: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
  amountText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.text.primary,
  },
  selectedText: {
    color: colors.text.white,
  },
  customAmountContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    backgroundColor: colors.background.paper,
  },
  currencySymbol: {
    fontSize: 16,
    color: colors.text.primary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  noTipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.paper,
    marginBottom: 16,
  },
  noTipButtonUnselected: {
    backgroundColor: colors.background.default,
    borderStyle: 'dashed',
  },
  noTipText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.text.primary,
  },
  noTipTextUnselected: {
    color: colors.text.secondary,
  },
}); 