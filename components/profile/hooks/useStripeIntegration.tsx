import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import appLogger from '@/utils/appLogger';

interface UseStripeIntegrationProps {
  session: Session | null;
}

export const useStripeIntegration = ({ session }: UseStripeIntegrationProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStripeOnboarding = async () => {
    setIsLoading(true);
    try {
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('stripe-onboarding', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      return data?.url;
    } catch (error) {
      appLogger.logError('Error starting onboarding:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to start onboarding process. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    setIsLoading(true);
    try {
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('stripe-dashboard-link', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      return data?.url;
    } catch (error) {
      appLogger.logError('Error accessing dashboard:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to access Stripe dashboard. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleStripeOnboarding,
    handleStripeDashboard,
    isLoading,
  };
}; 