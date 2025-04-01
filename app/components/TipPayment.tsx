import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/services/device';

type TipPaymentProps = {
  tourParticipantId: string;
};

export const TipPayment: React.FC<TipPaymentProps> = ({ tourParticipantId }) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const handleAmountSelect = async (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    // Initialize payment sheet when amount is selected
    await initializePaymentSheet(amount);
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
    
    // Initialize payment sheet when a valid custom amount is entered
    const amount = parseInt(numericValue, 10) * 100;
    if (amount > 0) {
      initializePaymentSheet(amount);
    } else {
      setIsPaymentReady(false);
    }
  };

  const initializePaymentSheet = async (amount: number) => {
    try {
      setIsLoading(true);
      setIsPaymentReady(false);
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

      setIsPaymentReady(true);
    } catch (err) {
      console.error('Payment initialization error:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initialize payment'
      );
      setIsPaymentReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      if (isPaymentReady) {
        // Simply present the payment sheet without any parameters
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
        
        // Reset form
        setSelectedAmount(null);
        setCustomAmount('');
        setIsPaymentReady(false);
      }
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
    return `£${(amount / 100).toFixed(2)}`;
  };

  const predefinedAmounts = [200, 500, 1000]; // £2, £5, £10

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Would you like to leave a tip?</Text>
      
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
            placeholder="0.00"
            keyboardType="numeric"
            maxLength={6}
            editable={!isLoading}
          />
        </View>
      </View>

      {(selectedAmount || customAmount) && (
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading || !isPaymentReady}
        >
          <Text style={styles.submitText}>
            {isLoading ? 'Processing...' : 'Submit Tip'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  selectedButton: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  amountText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333333',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  customAmountContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#333333',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 