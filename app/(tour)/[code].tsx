import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/config/theme';
import { TourPendingScreen } from '@/components/tour/TourPendingScreen';
import { TourActiveScreen } from '@/components/tour/TourActiveScreen';
import { TourCompletedScreen } from '@/components/tour/TourCompletedScreen';
import { TourErrorScreen } from '@/components/tour/TourErrorScreen';
import { useTourManagement } from '@/hooks/useTourManagement';
import { useCallback } from 'react';
import { TourThankYouScreen } from '@/components/tour/TourThankYouScreen';
import { useFocusEffect } from '@react-navigation/native';

export default function TourCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  
  if (!code) {
    router.replace('/');
    return null;
  }
  
  const {
    tour,
    isLoading,
    error,
    isConnected,
    isMuted,
    onToggleMute,
    onLeaveTour,
    onRatingSubmit,
    guideInfo,
    hasRated
  } = useTourManagement(code);

  // Handle leaving tour and navigation
  const handleLeaveTour = useCallback(async () => {
    try {
      await onLeaveTour();
      router.replace('/');
    } catch (error) {
      console.error('Error leaving tour:', error);
      // Even if there's an error updating the leave time, we still want to let them leave
      router.replace('/');
    }
  }, [onLeaveTour, router]);

  // Handle navigation state changes
  useFocusEffect(
    useCallback(() => {
      // Component is focused (user navigated to this screen)
      console.log('Tour screen focused');
      
      return () => {
        // Component is unfocused (user navigated away from this screen)
        console.log('Tour screen unfocused');
      };
    }, [])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (error) {
    return <TourErrorScreen message={error.message} />;
  }

  if (!tour) {
    return <TourErrorScreen />;
  }

  // Only show thank you screen if tour is completed AND has been rated
  if (tour.status === 'completed' && hasRated && guideInfo) {
    return (
      <TourThankYouScreen
        guideName={guideInfo.name}
        tourName={tour.name}
        recommendationsLink={guideInfo.recommendationsLink}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {tour.status === 'pending' && (
        <TourPendingScreen
          tour={tour}
          onLeaveTour={handleLeaveTour}
        />
      )}

      {tour.status === 'active' && (
        <TourActiveScreen
          tour={tour}
          isConnected={isConnected}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onLeaveTour={handleLeaveTour}
        />
      )}

      {tour.status === 'completed' && !hasRated && (
        <TourCompletedScreen
          tour={tour}
          onRatingSubmit={onRatingSubmit}
          onLeaveTour={handleLeaveTour}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
}); 