import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/services/tour';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

type GuideInfo = {
  full_name: string;
  avatar_url: string | null;
};

type TourActiveScreenProps = {
  tour: Tour;
  isConnected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onLeaveTour: () => void;
};

export const TourActiveScreen = ({ 
  tour, 
  isConnected, 
  isMuted, 
  onToggleMute, 
  onLeaveTour 
}: TourActiveScreenProps) => {
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
        console.error('Error fetching guide info:', error);
      }
    };

    fetchGuideInfo();
  }, [tour.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tour.name}</Text>
      </View>

      {/* Status Badges */}
      <View style={styles.badgeContainer}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Live</Text>
        </View>
        <View style={[styles.connectionBadge, isConnected ? styles.connectedBadge : styles.disconnectedBadge]}>
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

            {/* Guide Info */}
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
          <Text style={styles.guideName}>{guideInfo?.full_name || 'Tour Guide'}</Text>
          <Text style={styles.guideTitle}>Your Tour Guide</Text>
        </View>
      </View>

      {/* Audio Visualization */}
      <View style={styles.contentContainer}>
        <Image 
          source={require('@/assets/images/audio-wave.gif')}
          style={styles.audioWaveGif}
        />
        
        {/* Mute Button */}
        <Button
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          variant="primary"
          onPress={onToggleMute}
          leftIcon={
            <Ionicons 
              name={isMuted ? 'volume-mute' : 'volume-high'} 
              size={24} 
              color={colors.text.white}
            />
          }
        />
      </View>

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Your audio will stream as long as you remain on this screen. You can lock your device, but navigating away will pause the audio stream. It will automatically reconnect when you return.
        </Text>
      </View>

      {/* Leave Button */}
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
    backgroundColor: colors.background.default,
    padding: spacing.lg,
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  statusBadge: {
    backgroundColor: colors.warning.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  connectionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  connectedBadge: {
    backgroundColor: colors.success.main,
  },
  disconnectedBadge: {
    backgroundColor: colors.error.main,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  connectionText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  audioWaveGif: {
    width: 120,
    height: 120,
    marginBottom: spacing.xl,
  },
  muteButton: {
    backgroundColor: colors.background.default,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  muteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
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
  infoContainer: {
    width: '100%',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 