import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Tour, getGuideTours } from '@/services/tour';
import { colors, spacing, borderRadius, shadows } from '../../../config/theme';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function ToursOverview() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTours() {
      try {
        const guideTours = await getGuideTours();
        setTours(guideTours);
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTours();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.error.main;
      case 'pending':
        return colors.warning.main;
      case 'completed':
        return colors.success.main;
      default:
        return colors.text.secondary;
    }
  };

  const renderTourCard = ({ item }: { item: Tour }) => (
    <TouchableOpacity 
      style={styles.tourCard}
      onPress={() => router.push(`/(guide)/${item.id}`)}
    >
      <View style={styles.tourHeader}>
        <Text style={styles.tourTitle}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.tourDetails}>
        <Text style={styles.tourCode}>Code: {item.unique_code || 'Not generated'}</Text>
        <Text style={styles.tourDate}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tours}
        renderItem={renderTourCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tours found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  listContainer: {
    padding: spacing.md,
  },
  tourCard: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    color: colors.text.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tourDetails: {
    marginTop: spacing.sm,
  },
  tourCode: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tourDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
}); 