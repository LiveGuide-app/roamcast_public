import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/services/tour';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import appLogger from '@/utils/appLogger';

type GuideInfo = {
  full_name: string;
  avatar_url: string | null;
};

type TourPendingScreenProps = {
  tour: Tour;
  onLeaveTour: () => void;
};

export const TourPendingScreen = ({ tour, onLeaveTour }: TourPendingScreenProps) => {
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);

  useEffect(() => {
    const fetchGuideInfo = async () => {
      try {
        // First get the tour with guide_id
        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('guide_id')
          .eq('id', tour.id)
          .single();

        if (tourError) throw tourError;
        if (!tourData?.guide_id) throw new Error('No guide found for this tour');

        // Then get the guide's information
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, profile_image_url')
          .eq('id', tourData.guide_id)
          .single();

        if (userError) throw userError;
        setGuideInfo({
          full_name: userData.full_name,
          avatar_url: userData.profile_image_url
        });
      } catch (error) {
        appLogger.logError('Error fetching guide info:', error instanceof Error ? error : new Error(String(error)));
      }
    };

    fetchGuideInfo();
  }, [tour.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tour.name}</Text>
      </View>

      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Tour Starting Soon</Text>
      </View>

      <View style={styles.guideSection}>
        {guideInfo?.avatar_url ? (
          <Image 
            source={{ uri: guideInfo.avatar_url }} 
            style={styles.guideAvatar} 
          />
        ) : (
          <View style={styles.guideAvatar}>
            <Ionicons name="person" size={24} color={colors.text.white} />
          </View>
        )}
        <View style={styles.guideInfo}>
          <Text style={styles.guideName}>{guideInfo?.full_name || 'Loading...'}</Text>
          <Text style={styles.guideTitle}>Your Tour Guide</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.audioIcon}>
          <MaterialIcons name="multitrack-audio" size={48} color={colors.background.paper} />
        </View>
        
        <Text style={styles.waitingText}>Waiting for tour to start</Text>
        <Text style={styles.helperText}>Your Guide will begin the audio tour shortly. Please make sure your volume is turned up.</Text>
      </View>

      <Button
        title="Leave Tour"
        variant="danger-outline"
        onPress={onLeaveTour}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.white,
    flex: 1,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.warning.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  guideSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  guideAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  guideInfo: {
    flex: 1,
  },
  guideName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  guideTitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  audioIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  }
}); 