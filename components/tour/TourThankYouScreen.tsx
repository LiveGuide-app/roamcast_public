import { View, Text, StyleSheet, Linking } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';
import { Button } from '@/components/Button';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

type TourThankYouScreenProps = {
  guideName: string;
  recommendationsLink: string | null;
};

export const TourThankYouScreen = ({
  guideName,
  recommendationsLink,
}: TourThankYouScreenProps) => {
  const router = useRouter();
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    // Shoot confetti when component mounts
    setTimeout(() => {
      confettiRef.current?.start();
    }, 100);
  }, []);

  const handleViewRecommendations = async () => {
    if (recommendationsLink) {
      try {
        const canOpen = await Linking.canOpenURL(recommendationsLink);
        if (canOpen) {
          await Linking.openURL(recommendationsLink);
        }
      } catch (error) {
        console.error('Error opening recommendations link:', error);
      }
    }
  };

  const handleReturnHome = () => {
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={2500}
        explosionSpeed={350}
        colors={[colors.primary.main, colors.primary.light, colors.primary.dark, '#FFF']}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Thank you for joining the tour!</Text>
        
        {recommendationsLink && (
          <Text style={styles.message}>
            {guideName} has put together some recommendations of things to do. Click
            the button below to explore
          </Text>
        )}

        {recommendationsLink && (
          <View style={styles.recommendationsContainer}>
            <Button
              title="View recommendations"
              variant="primary"
              onPress={handleViewRecommendations}
              style={styles.recommendationsButton}
            />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Return to Home"
          variant="outline"
          onPress={handleReturnHome}
          style={styles.homeButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  recommendationsContainer: {
    width: '100%',
  },
  recommendationsButton: {
    backgroundColor: colors.primary.dark,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.default,
  },
  homeButton: {
    borderColor: colors.primary.dark,
  },
}); 