import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getGuideRatings, GuideRatings } from '@/services/tour';

interface ProfileData {
  user: User | null;
  stripeAccountEnabled: boolean;
  profileImageUrl: string | null;
  ratings: GuideRatings;
  isLoading: boolean;
  ratingError: string | null;
}

export const useProfileData = () => {
  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    user: authUser,
    stripeAccountEnabled: false,
    profileImageUrl: null,
    ratings: { averageRating: 0, totalReviews: 0 },
    isLoading: true,
    ratingError: null,
  });

  const loadProfile = async () => {
    try {
      setProfileData(prev => ({ ...prev, isLoading: true, ratingError: null }));
      
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch stripe account status and profile image
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_account_enabled, profile_image_url')
        .eq('id', user?.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Fetch ratings
      try {
        const guideRatings = await getGuideRatings();
        setProfileData(prev => ({
          ...prev,
          user,
          stripeAccountEnabled: userData?.stripe_account_enabled || false,
          profileImageUrl: userData?.profile_image_url || null,
          ratings: guideRatings,
          isLoading: false,
        }));
      } catch (error) {
        setProfileData(prev => ({
          ...prev,
          user,
          stripeAccountEnabled: userData?.stripe_account_enabled || false,
          profileImageUrl: userData?.profile_image_url || null,
          ratingError: 'Failed to load ratings',
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfileData(prev => ({
        ...prev,
        isLoading: false,
        ratingError: 'Failed to load profile data',
      }));
    }
  };

  const updateProfileImageUrl = (url: string) => {
    setProfileData(prev => ({
      ...prev,
      profileImageUrl: url,
    }));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    ...profileData,
    refreshProfile: loadProfile,
    updateProfileImageUrl,
  };
}; 