import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../../config/theme';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

export default function GuideProfile() {
  const router = useRouter();
  const { signOut, user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<string | null>(null);
  const [stripeAccountEnabled, setStripeAccountEnabled] = useState<boolean>(false);

  useEffect(() => {
    fetchStripeStatus();
  }, []);

  const fetchStripeStatus = async () => {
    try {
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('stripe_account_status, stripe_account_enabled')
        .eq('id', user?.id)
        .is('deleted_at', null)
        .maybeSingle();
      console.log('Query result:', { userData, error });

      if (error) throw error;

      if (userData) {
        setStripeAccountStatus(userData.stripe_account_status);
        setStripeAccountEnabled(userData.stripe_account_enabled);
      } else {
        // Set default values if no user data is found
        setStripeAccountStatus(null);
        setStripeAccountEnabled(false);
      }
    } catch (error) {
      console.error('Error fetching stripe status:', error);
    }
  };

  const handleStripeOnboarding = async () => {
    setIsLoading(true);
    try {
      if (!user || !session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('stripe-onboarding', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        router.push(data.url);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      Alert.alert('Error', 'Failed to start onboarding process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    setIsLoading(true);
    try {
      if (!user || !session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('stripe-dashboard-link', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (error) throw error;
      
      if (data?.url) {
        router.push(data.url);
      }
    } catch (error) {
      console.error('Error accessing dashboard:', error);
      Alert.alert('Error', 'Failed to access Stripe dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase() || 'G'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Settings</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary.main} />
        ) : stripeAccountEnabled ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStripeDashboard}
          >
            <Text style={styles.buttonText}>Open Stripe Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStripeOnboarding}
          >
            <Text style={styles.buttonText}>Set Up Payments</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.statusText}>
          Status: {stripeAccountStatus}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity 
          style={styles.settingButton}
          onPress={() => {/* TODO: Implement edit profile */}}
        >
          <Text style={styles.settingButtonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingButton}
          onPress={() => {/* TODO: Implement notifications settings */}}
        >
          <Text style={styles.settingButtonText}>Notification Settings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={signOut}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    color: colors.text.white,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '500',
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.small,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  settingButton: {
    backgroundColor: colors.background.default,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  settingButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  button: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  primaryButton: {
    backgroundColor: colors.primary.main,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  logoutButton: {
    margin: spacing.lg,
    backgroundColor: colors.error.light,
    
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 