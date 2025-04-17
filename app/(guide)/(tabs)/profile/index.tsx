import React, { useState } from 'react';
import { ScrollView, StatusBar, Alert, View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/config/theme';
import { useAuth } from '@/components/auth/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PaymentSettings } from '@/components/profile/PaymentSettings';
import { RecommendationsForm } from '@/components/profile/RecommendationsForm';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { FAQ } from '@/components/profile/FAQ';
import { useProfileData } from '@/components/profile/hooks/useProfileData';
import { useProfileImage } from '@/components/profile/hooks/useProfileImage';
import { useStripeIntegration } from '@/components/profile/hooks/useStripeIntegration';
import { ChangeCredentialsModal } from '@/components/profile/ChangeCredentialsModal';

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
    fullName,
    recentTourCount,
    refreshProfile,
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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleDeleteRecommendations = async () => {
    const success = await updateRecommendationsLink('');
    if (success) {
      Alert.alert('Success', 'Recommendations link removed');
    } else {
      Alert.alert('Error', 'Failed to remove recommendations link');
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.default }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        <ProfileHeader
          user={user}
          profileImageUrl={profileImageUrl}
          ratings={ratings}
          ratingError={ratingError}
          isUploading={isUploading}
          onImagePress={handleImagePick}
          fullName={fullName}
        />

        <PaymentSettings
          stripeAccountEnabled={stripeAccountEnabled}
          isLoading={isLoading || isStripeLoading}
          onStripePress={handleStripePress}
          recentTourCount={recentTourCount}
        />

        <RecommendationsForm
          recommendationsLink={recommendationsLink}
          isLoading={isLoading}
          onSave={handleSaveRecommendations}
          onDelete={handleDeleteRecommendations}
        />

        {/*<ProfileSettings
          onChangePassword={handleChangePassword}
          onChangeEmail={handleChangeEmail}
        />*/}

        <FAQ faqUrl="https://www.tryroamcast.com" />

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