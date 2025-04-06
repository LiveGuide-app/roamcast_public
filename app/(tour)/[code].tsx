import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/config/theme';
import { TourPendingScreen } from '@/components/tour/TourPendingScreen';
import { TourActiveScreen } from '@/components/tour/TourActiveScreen';
import { TourCompletedScreen } from '@/components/tour/TourCompletedScreen';
import { TourErrorScreen } from '@/components/tour/TourErrorScreen';
import { useTourManagement } from '@/hooks/useTourManagement';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { getDeviceId } from '@/services/device';
import { TourThankYouScreen } from '@/components/tour/TourThankYouScreen';

export default function TourCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [hasRated, setHasRated] = useState(false);
  const [guideInfo, setGuideInfo] = useState<{ name: string; recommendationsLink: string | null } | null>(null);
  
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
    onRatingSubmit
  } = useTourManagement(code);

  useEffect(() => {
    async function checkRating() {
      if (!tour?.id) return;

      try {
        const deviceId = await getDeviceId();
        console.log('Checking rating for tour:', tour.id, 'device:', deviceId);
        
        // Check if this device has already rated this tour
        const { data: rating, error: ratingError } = await supabase
          .from('feedback')
          .select('id')
          .eq('tour_id', tour.id)
          .eq('device_id', deviceId)
          .is('deleted_at', null)
          .single();

        console.log('Rating check result:', { rating, error: ratingError });

        if (rating) {
          console.log('Found existing rating:', rating);
          // Get the guide ID from the tours table
          const { data: tourData, error: tourError } = await supabase
            .from('tours')
            .select('guide_id')
            .eq('id', tour.id)
            .single();

          console.log('Tour data:', { tourData, error: tourError });

          if (tourData?.guide_id) {
            // If there's a rating, also fetch guide info
            const { data: guide, error: guideError } = await supabase
              .from('users')
              .select('full_name, recommendations_link')
              .eq('id', tourData.guide_id)
              .single();

            console.log('Guide info:', { guide, error: guideError });

            if (guide) {
              setGuideInfo({
                name: guide.full_name,
                recommendationsLink: guide.recommendations_link
              });
            }
          }
          setHasRated(true);
        }
      } catch (error) {
        // If no rating found, single() will throw an error, which is fine
        console.log('Rating check error:', error);
      }
    }

    checkRating();
  }, [tour?.id]);

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
        recommendationsLink={guideInfo.recommendationsLink}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {tour.status === 'pending' && (
        <TourPendingScreen
          tour={tour}
          onLeaveTour={onLeaveTour}
        />
      )}

      {tour.status === 'active' && (
        <TourActiveScreen
          tour={tour}
          isConnected={isConnected}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onLeaveTour={onLeaveTour}
        />
      )}

      {tour.status === 'completed' && !hasRated && (
        <TourCompletedScreen
          tour={tour}
          onRatingSubmit={onRatingSubmit}
          onLeaveTour={onLeaveTour}
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