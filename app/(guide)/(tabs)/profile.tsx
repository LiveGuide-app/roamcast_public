import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../../config/theme';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GuideProfile() {
  const router = useRouter();
  const { signOut, user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccountEnabled, setStripeAccountEnabled] = useState<boolean>(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchStripeStatus();
  }, []);

  const fetchStripeStatus = async () => {
    try {
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('stripe_account_enabled')
        .eq('id', user?.id)
        .is('deleted_at', null)
        .maybeSingle();
      console.log('Query result:', { userData, error });

      if (error) throw error;

      if (userData) {
        setStripeAccountEnabled(userData.stripe_account_enabled);
      } else {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.email?.[0].toUpperCase() || 'G'}
              </Text>
              <View style={styles.editIconContainer}>
                <Ionicons name="pencil" size={12} color="white" />
              </View>
            </View>
            <Text style={styles.name}>Marcus Lee</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#4CAF50" />
              <Text style={styles.rating}>4.8</Text>
              <Text style={styles.reviewCount}>(127 reviews)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Settings</Text>
          <Text style={styles.sectionDescription}>
            Roamcast helps you earn tips from guests after each tour. They'll be prompted to leave a review and send an optional tip. Securely set up or link your Stripe account below to receive payments directly. A small processing fee applies.
          </Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary.main} />
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={stripeAccountEnabled ? handleStripeDashboard : handleStripeOnboarding}
            >
              <Text style={styles.buttonText}>
                {stripeAccountEnabled ? 'Open Stripe Dashboard' : 'Set up payments'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <Text style={styles.sectionDescription}>
            You can add a link to a document such as a google sheet or pdf with recommendations that will be shown to your guests after the tour
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Settings</Text>
          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Change Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQ</Text>
        </View>

        <View style={styles.logoutContainer}>
          <Button 
            title="Logout"
            variant="danger-outline"
            onPress={signOut}
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    backgroundColor: colors.background.paper,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#008080',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    color: '#757575',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  reviewCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background.default,
  },
  saveButton: {
    alignSelf: 'flex-end',
  },
  saveButtonText: {
    color: '#008080',
    fontSize: 16,
    fontWeight: '500',
  },
  settingButton: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingButtonText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008080',
  },
  primaryButton: {
    backgroundColor: '#008080',
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutContainer: {
    padding: spacing.lg,
  },
  logoutButton: {
    width: '100%',
    backgroundColor: colors.background.paper,
  } as const,
}); 