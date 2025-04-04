import React from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/config/theme';
import { useAuth } from '@/components/auth/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ProfileHeader } from './components/ProfileHeader';
import { PaymentSettings } from './components/PaymentSettings';
import { RecommendationsForm } from './components/RecommendationsForm';
import { ProfileSettings } from './components/ProfileSettings';
import { FAQ } from './components/FAQ';
import { useProfileData } from './hooks/useProfileData';
import { useProfileImage } from './hooks/useProfileImage';
import { useStripeIntegration } from './hooks/useStripeIntegration';

export default function GuideProfile() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const { 
    user,
    profileImageUrl,
    ratings,
    ratingError,
    stripeAccountEnabled,
    isLoading,
    updateProfileImageUrl,
  } = useProfileData();

  const { handleImagePick, isUploading } = useProfileImage({
    userId: user?.id,
    onImageUpdated: updateProfileImageUrl,
  });

  const { 
    handleStripeOnboarding,
    handleStripeDashboard,
    isLoading: isStripeLoading,
  } = useStripeIntegration({ session });

  const handleStripePress = async () => {
    const url = await (stripeAccountEnabled ? handleStripeDashboard() : handleStripeOnboarding());
    if (url) {
      router.push(url);
    }
  };

  const handleSaveRecommendations = (password: string) => {
    // TODO: Implement recommendations save functionality
    console.log('Save recommendations with password:', password);
  };

  const handleChangePassword = () => {
    // TODO: Implement password change functionality
    console.log('Change password');
  };

  const handleChangeEmail = () => {
    // TODO: Implement email change functionality
    console.log('Change email');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.default }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      <ScrollView>
        <ProfileHeader
          user={user}
          profileImageUrl={profileImageUrl}
          ratings={ratings}
          ratingError={ratingError}
          isUploading={isUploading}
          onImagePress={handleImagePick}
        />

        <PaymentSettings
          stripeAccountEnabled={stripeAccountEnabled}
          isLoading={isLoading || isStripeLoading}
          onStripePress={handleStripePress}
        />

        <RecommendationsForm
          onSave={handleSaveRecommendations}
        />

        <ProfileSettings
          onChangePassword={handleChangePassword}
          onChangeEmail={handleChangeEmail}
        />

        <FAQ />

        <Button 
          title="Logout"
          variant="danger-outline"
          onPress={signOut}
          style={{ margin: 16, backgroundColor: colors.background.paper }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}; 