import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/config/theme';
import { TourPendingScreen } from '@/components/tour/TourPendingScreen';
import { TourActiveScreen } from '@/components/tour/TourActiveScreen';
import { TourCompletedScreen } from '@/components/tour/TourCompletedScreen';
import { useTourManagement } from '@/hooks/useTourManagement';
import { useTourPayment } from '@/hooks/useTourPayment';

export default function TourCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  
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

  const {
    isPaymentReady,
    isLoading: isPaymentLoading,
    onTipSubmit
  } = useTourPayment();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (error) {
    // Error handling is done in the hook
    return null;
  }

  if (!tour) {
    return null;
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

      {tour.status === 'completed' && (
        <TourCompletedScreen
          tour={tour}
          onRatingSubmit={onRatingSubmit}
          onTipSubmit={onTipSubmit}
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