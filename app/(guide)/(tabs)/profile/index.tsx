import React, { useState } from 'react';
import { ScrollView, StatusBar, Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/config/theme';
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
import { ChangeCredentialsModal } from './components/ChangeCredentialsModal';

export default function GuideProfile() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const { 
    user,
    profileImageUrl,
    ratings,
    ratingError,
    stripeAccountEnabled,
    recommendationsLink,
    isLoading,
    updateProfileImageUrl,
    updateRecommendationsLink,
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

  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [credentialsModalType, setCredentialsModalType] = useState<'password' | 'email'>('password');

  const handleStripePress = async () => {
    const url = await (stripeAccountEnabled ? handleStripeDashboard() : handleStripeOnboarding());
    if (url) {
      router.push(url);
    }
  };

  const handleSaveRecommendations = async (link: string) => {
    if (!link) {
      Alert.alert('Error', 'Please enter a valid link');
      return;
    }

    const success = await updateRecommendationsLink(link);
    if (success) {
      Alert.alert('Success', 'Recommendations link saved successfully');
    } else {
      Alert.alert('Error', 'Failed to save recommendations link');
    }
  };

  const handleChangePassword = () => {
    setCredentialsModalType('password');
    setCredentialsModalVisible(true);
  };

  const handleChangeEmail = () => {
    setCredentialsModalType('email');
    setCredentialsModalVisible(true);
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
          recommendationsLink={recommendationsLink}
          isLoading={isLoading}
          onSave={handleSaveRecommendations}
        />

        <ProfileSettings
          onChangePassword={handleChangePassword}
          onChangeEmail={handleChangeEmail}
        />

        <FAQ faqUrl="https://roamcast.me/faq" />

        <View style={styles.section}>
          <Button 
            title="Logout"
            variant="danger-outline"
            onPress={signOut}
          />
        </View>
      </ScrollView>
      <ChangeCredentialsModal
        isVisible={credentialsModalVisible}
        onClose={() => setCredentialsModalVisible(false)}
        type={credentialsModalType}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    marginTop: spacing.md,
  },
}); 