import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tour } from '@/services/tour';
import { LiveDuration } from './LiveDuration';

interface MetricCardProps {
  label: string;
  value: string | number | React.ReactNode;
  subtext?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  subtext, 
  icon,
  iconColor = colors.primary.main 
}) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricValueContainer}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={iconColor} 
          style={styles.metricIcon}
        />
      )}
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={styles.metricValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
    {subtext && (
      <Text style={styles.metricSubtext}>{subtext}</Text>
    )}
  </View>
);

interface TourMetricsProps {
  metrics: {
    guests?: number;
    duration?: string;
    rating?: number | null;
    totalReviews?: number;
    earnings?: number;
    totalTips?: number;
    completedAt?: string;
  };
  tour?: Tour | null;
  variant?: 'grid' | 'row';
}

export const TourMetrics: React.FC<TourMetricsProps> = ({ 
  metrics,
  tour,
  variant = 'grid'
}) => {
  return (
    <View style={[
      styles.container,
      variant === 'row' ? styles.rowContainer : styles.gridContainer
    ]}>
      {metrics.guests !== undefined && (
        <MetricCard
          label="Guests"
          value={metrics.guests}
          icon="people"
        />
      )}
      
      {tour?.status === 'active' && !tour?.room_finished_at ? (
        <MetricCard
          label="Duration"
          value={<LiveDuration tour={tour} />}
          icon="time"
        />
      ) : metrics.duration && (
        <MetricCard
          label="Duration"
          value={metrics.duration}
          icon="time"
        />
      )}
      
      {metrics.rating !== undefined && (
        <MetricCard
          label="Rating"
          value={metrics.rating?.toFixed(1) || 'N/A'}
          subtext={metrics.totalReviews ? 
            `(${metrics.totalReviews} review${metrics.totalReviews !== 1 ? 's' : ''})` : 
            undefined}
          icon="star"
          iconColor={colors.warning.main}
        />
      )}
      
      {metrics.earnings !== undefined && (
        <MetricCard
          label="Earnings"
          value={`£${metrics.earnings}`}
          subtext={metrics.totalTips ? 
            `(${metrics.totalTips} tip${metrics.totalTips !== 1 ? 's' : ''})` : 
            undefined}
          icon="cash"
          iconColor={colors.success.main}
        />
      )}

      {metrics.completedAt && (
        <MetricCard
          label="Completed"
          value={new Date(metrics.completedAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
          icon="calendar"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  metricIcon: {
    marginRight: spacing.xs,
  },
  metricSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
}); 