import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Tour, GuideStats, getGuideTours, getGuideStats } from '../../../services/tour';
import { colors, spacing, borderRadius, shadows } from '../../../config/theme';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ToursOverview() {
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<Tour[]>([]);
  const [stats, setStats] = useState<GuideStats>({
    totalTours: 0,
    totalGuests: 0,
    totalEarnings: 0
  });
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [toursData, statsData] = await Promise.all([
        getGuideTours(),
        getGuideStats()
      ]);
      setTours(toursData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const groupToursByStatus = () => {
    const grouped = {
      live: tours.filter(t => t.status === 'active'),
      upcoming: tours.filter(t => t.status === 'pending'),
      completed: tours.filter(t => t.status === 'completed'),
      cancelled: tours.filter(t => t.status === 'cancelled')
    };
    return grouped;
  };

  const renderTourCard = (tour: Tour) => (
    <TouchableOpacity
      key={tour.id}
      style={styles.tourCard}
      onPress={() => router.push(`/(guide)/${tour.id}`)}
    >
      <View style={styles.tourHeader}>
        <Text style={styles.tourName}>{tour.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(tour.status) }]}>
          <Text style={styles.statusText}>{getStatusText(tour.status)}</Text>
        </View>
      </View>
      <Text style={styles.tourDate}>
        {new Date(tour.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}
      </Text>
      <Text style={styles.tourDetails}>
        Code: {tour.unique_code} • Guests: {tour.total_participants} • Tips: £{(tour.total_tips || 0) / 100}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  const groupedTours = groupToursByStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.default} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>My Tours</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Tours</Text>
            <Text style={styles.statValue}>{stats.totalTours}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Guests</Text>
            <Text style={styles.statValue}>{stats.totalGuests}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Earnings</Text>
            <Text style={styles.statValue}>£{(stats.totalEarnings || 0) / 100}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/(guide)/create-tour')}
        >
          <Text style={styles.createButtonText}>+ Create New Tour</Text>
        </TouchableOpacity>

        {groupedTours.live.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Tours</Text>
            {groupedTours.live.map(renderTourCard)}
          </View>
        )}

        {groupedTours.upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Tours</Text>
            {groupedTours.upcoming.map(renderTourCard)}
          </View>
        )}

        {groupedTours.completed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Tours</Text>
            {groupedTours.completed.map(renderTourCard)}
          </View>
        )}

        {groupedTours.cancelled.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancelled Tours</Text>
            {groupedTours.cancelled.map(renderTourCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    marginLeft: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.white,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.white,
    marginBottom: spacing.xs,
  },
  createButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  createButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  tourCard: {
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tourName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
  tourDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  tourDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'active':
      return colors.error.main; // Red for LIVE
    case 'pending':
      return colors.warning.main; // Yellow for Pending
    case 'completed':
      return colors.success.main; // Green for Completed
    case 'cancelled':
      return colors.error.light; // Light red for Cancelled
    default:
      return colors.text.secondary;
  }
}

function getStatusText(status: string) {
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
} 