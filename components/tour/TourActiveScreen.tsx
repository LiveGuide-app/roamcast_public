import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Tour } from '@/services/tour';
import { Ionicons } from '@expo/vector-icons';

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
  return (
    <View style={styles.contentContainer}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Live Tour</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.tourName}>{tour.name}</Text>
        
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, isConnected ? styles.connectedDot : styles.disconnectedDot]} />
          <Text style={[styles.connectionText, isConnected ? styles.connectedText : styles.disconnectedText]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.audioControls}>
          <View style={styles.waveformContainer}>
            <Ionicons name="radio" size={24} color={colors.primary.main} />
            <View style={styles.waveform}>
              {[...Array(5)].map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.waveformBar,
                    isConnected && styles.waveformBarActive
                  ]} 
                />
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.muteButton, isMuted && styles.muteButtonActive]}
            onPress={onToggleMute}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color={isMuted ? colors.text.secondary : colors.primary.main}
            />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.leaveButton}
        onPress={onLeaveTour}
      >
        <Text style={styles.leaveButtonText}>Leave Tour</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  statusBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.small,
    flex: 1,
  },
  tourName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  connectedDot: {
    backgroundColor: colors.success.main,
  },
  disconnectedDot: {
    backgroundColor: colors.error.main,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectedText: {
    color: colors.success.main,
  },
  disconnectedText: {
    color: colors.error.main,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  waveformBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary.main,
    marginHorizontal: 2,
    borderRadius: borderRadius.sm,
  },
  waveformBarActive: {
    backgroundColor: colors.success.main,
  },
  muteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.default,
  },
  muteButtonActive: {
    backgroundColor: colors.background.paper,
  },
  leaveButton: {
    backgroundColor: colors.error.main,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  leaveButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 