import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';

export type TourStatus = 'active' | 'pending' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: TourStatus;
  isConnected?: boolean;
  variant?: 'default' | 'large';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  isConnected,
  variant = 'default' 
}) => {
  const getStatusColor = (status: TourStatus) => {
    switch (status) {
      case 'active':
        return colors.warning.main;
      case 'pending':
        return colors.warning.light;
      case 'completed':
        return colors.success.main;
      case 'cancelled':
        return colors.error.main;
      default:
        return colors.text.secondary;
    }
  };

  const getStatusText = (status: TourStatus) => {
    switch (status) {
      case 'active':
        return 'LIVE';
      case 'pending':
        return 'Pending';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <View style={styles.statusContainer}>
      <View style={[
        styles.statusBadge,
        variant === 'large' && styles.statusBadgeLarge,
        { backgroundColor: getStatusColor(status) }
      ]}>
        <Text style={[
          styles.statusText,
          variant === 'large' && styles.statusTextLarge
        ]}>
          {getStatusText(status)}
        </Text>
      </View>
      {status === 'active' && isConnected !== undefined && (
        <View style={[
          styles.statusBadge,
          { backgroundColor: isConnected ? colors.success.main : colors.error.main }
        ]}>
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 32,
  },
  statusBadgeLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  statusTextLarge: {
    fontSize: 16,
  },
}); 