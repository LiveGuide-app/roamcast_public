import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { getGuideRatings, GuideRatings, getRecentTourCount } from '@/services/tour';
import appLogger from '@/utils/appLogger';

interface ProfileData {
  user: User | null;
  stripeAccountEnabled: boolean;
  profileImageUrl: string | null;
  recommendationsLink: string | null;
  fullName: string | null;
  ratings: GuideRatings;
  recentTourCount: number;
  isLoading: boolean;
  ratingError: string | null;
}

export const useProfileData = () => {
  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    user: authUser,
    stripeAccountEnabled: false,
    profileImageUrl: null,
    recommendationsLink: null,
    fullName: null,
    ratings: { averageRating: 0, totalReviews: 0 },
    recentTourCount: 0,
    isLoading: true,
    ratingError: null,
  });

  const loadProfile = async () => {
    try {
      setProfileData(prev => ({ ...prev, isLoading: true, ratingError: null }));
      
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch stripe account status, profile image, and recommendations link
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_account_enabled, profile_image_url, recommendations_link, full_name')
        .eq('id', user?.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Fetch ratings and recent tour count in parallel
      try {
        const [guideRatings, tourCount] = await Promise.all([
          getGuideRatings(),
          getRecentTourCount()
        ]);
        
        setProfileData(prev => ({
          ...prev,
          user,
          stripeAccountEnabled: userData?.stripe_account_enabled || false,
          profileImageUrl: userData?.profile_image_url || null,
          recommendationsLink: userData?.recommendations_link || null,
          fullName: userData?.full_name || null,
          ratings: guideRatings,
          recentTourCount: tourCount,
          isLoading: false,
        }));
      } catch (error) {
        setProfileData(prev => ({
          ...prev,
          user,
          stripeAccountEnabled: userData?.stripe_account_enabled || false,
          profileImageUrl: userData?.profile_image_url || null,
          recommendationsLink: userData?.recommendations_link || null,
          fullName: userData?.full_name || null,
          ratingError: 'Failed to load ratings',
          isLoading: false,
        }));
      }
    } catch (error) {
      appLogger.logError('Error loading profile:', error instanceof Error ? error : new Error(String(error)));
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

  const updateRecommendationsLink = async (link: string) => {
    try {
      setProfileData(prev => ({ ...prev, isLoading: true }));
      
      // If link is empty string, set it to null in the database
      const linkValue = link.trim() === '' ? null : link.trim();
      
      const { error } = await supabase
        .from('users')
        .update({ recommendations_link: linkValue })
        .eq('id', profileData.user?.id);

      if (error) throw error;

      setProfileData(prev => ({
        ...prev,
        recommendationsLink: linkValue,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      appLogger.logError('Error updating recommendations link:', error instanceof Error ? error : new Error(String(error)));
      setProfileData(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    ...profileData,
    refreshProfile: loadProfile,
    updateProfileImageUrl,
    updateRecommendationsLink,
  };
}; 