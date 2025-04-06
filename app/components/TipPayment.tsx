import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/services/device';
import { colors, borderRadius } from '@/config/theme';

export type TipPaymentHandle = {
  handlePayment: () => Promise<void>;
};

type TipPaymentProps = {
  tourParticipantId: string;
  onAmountChange: (amount: number | null) => void;
  onPaymentReady: (isReady: boolean) => void;
  onPaymentComplete: () => void;
};

export const TipPayment = forwardRef<TipPaymentHandle, TipPaymentProps>(({ 
  tourParticipantId,
  onAmountChange,
  onPaymentReady,
  onPaymentComplete
}, ref) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useImperativeHandle(ref, () => ({
    handlePayment: async () => {
      // If no tip is selected, complete without any Stripe calls
      if (selectedAmount === null && !customAmount) {
        onPaymentComplete();
        return;
      }
      
      const amount = selectedAmount || (customAmount ? parseInt(customAmount, 10) * 100 : null);
      if (!amount) {
        Alert.alert('Error', 'Please select a tip amount');
        return;
      }
      await handlePayment(amount);
    }
  }));

  const handleAmountSelect = (amount: number | null) => {
    setSelectedAmount(amount);
    onAmountChange(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
    const amount = numericValue ? parseInt(numericValue, 10) * 100 : null;
    onAmountChange(amount);
  };

  const initializePaymentSheet = async (amount: number) => {
    try {
      const deviceId = await getDeviceId();

      // Create payment intent
      const { data, error: supabaseError } = await supabase.functions.invoke('stripe-tip-payment', {
        body: {
          tourParticipantId,
          amount,
          currency: 'gbp',
          deviceId,
        },
      });

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error(supabaseError.message);
      }

      const { 
        paymentIntent: paymentIntentClientSecret, 
        ephemeralKey,
        customer
      } = data;

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Roamcast',
        paymentIntentClientSecret,
        customerEphemeralKeySecret: ephemeralKey,
        customerId: customer,
        allowsDelayedPaymentMethods: true,
        returnURL: 'roamcastv7://',
        defaultBillingDetails: {
          name: 'Guest',
        },
      });

      if (initError) {
        console.error('Init payment sheet error:', initError);
        throw initError;
      }

      return true;
    } catch (err) {
      console.error('Payment initialization error:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initialize payment'
      );
      return false;
    }
  };

  const handlePayment = async (amount: number) => {
    try {
      setIsLoading(true);
      onPaymentReady(false);
      
      // Initialize payment sheet first
      const isInitialized = await initializePaymentSheet(amount);
      if (!isInitialized) {
        return;
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        console.error('Present payment sheet error:', presentError);
        if (presentError.code === 'Canceled') {
          return;
        }
        throw presentError;
      }

      console.log('Payment successful');
      Alert.alert('Success', 'Thank you for your tip!');
      onPaymentComplete();
      
      // Reset form
      setSelectedAmount(null);
      setCustomAmount('');
      onPaymentReady(false);
      onAmountChange(null);
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Payment failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `£${(amount / 100).toFixed(0)}`;
  };

  const predefinedAmounts = [200, 500, 1000]; // £2, £5, £10

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
          <Text style={styles.currencySymbol}>£</Text>
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
          selectedAmount === null && !customAmount && styles.selectedButton,
        ]}
        onPress={() => handleAmountSelect(null)}
        disabled={isLoading}
      >
        <Text style={[
          styles.noTipText,
          selectedAmount === null && !customAmount && styles.selectedText,
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
  noTipText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.text.primary,
  },
}); 