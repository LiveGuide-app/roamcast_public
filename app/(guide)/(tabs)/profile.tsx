import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../../config/theme';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGuideRatings, GuideRatings } from '../../../services/tour';
import { User } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

export default function GuideProfile() {
  const router = useRouter();
  const { signOut, user: authUser, session } = useAuth();
  const [user, setUser] = useState<User | null>(authUser);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeAccountEnabled, setStripeAccountEnabled] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [ratings, setRatings] = useState<GuideRatings>({ averageRating: 0, totalReviews: 0 });
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setRatingError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch stripe account status and profile image
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_account_enabled, profile_image_url')
        .eq('id', user?.id)
        .single();

      if (!userError && userData) {
        setStripeAccountEnabled(userData.stripe_account_enabled || false);
        setProfileImage(userData.profile_image_url);
      }

      // Fetch ratings
      try {
        console.log('Fetching ratings...');
        const guideRatings = await getGuideRatings();
        console.log('Received guide ratings:', guideRatings);
        setRatings(guideRatings);
      } catch (ratingError) {
        console.error('Error fetching ratings:', ratingError);
        setRatingError('Failed to load ratings');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      // Early return if user cancelled
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      try {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        
        // Read the file
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Upload to Supabase Storage
        const fileName = `${user?.id}-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, Buffer.from(base64, 'base64'), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        // Update user profile
        const { error: updateError } = await supabase
          .from('users')
          .update({ profile_image_url: publicUrl.publicUrl })
          .eq('id', user?.id);

        if (updateError) {
          throw updateError;
        }

        setProfileImage(publicUrl.publicUrl);
      } finally {
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error handling image:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
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
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handleImagePick}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator color={colors.primary.main} />
              ) : profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.email?.[0].toUpperCase() || 'G'}
                </Text>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="pencil" size={12} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{user?.email || 'Guide'}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#4CAF50" />
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : ratingError ? (
                <Text style={styles.errorText}>{ratingError}</Text>
              ) : (
                <>
                  <Text style={styles.rating}>{ratings.averageRating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>({ratings.totalReviews} reviews)</Text>
                </>
              )}
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
  errorText: {
    color: colors.error.main,
    fontSize: 14,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
}); 