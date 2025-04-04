import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/config/theme';
import { User } from '@supabase/supabase-js';
import { GuideRatings } from '@/services/tour';

interface ProfileHeaderProps {
  user: User | null;
  profileImageUrl: string | null;
  ratings: GuideRatings;
  ratingError: string | null;
  isUploading: boolean;
  onImagePress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  profileImageUrl,
  ratings,
  ratingError,
  isUploading,
  onImagePress,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={onImagePress}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={colors.primary.main} />
          ) : profileImageUrl ? (
            <Image 
              source={{ uri: profileImageUrl }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {user?.email?.[0].toUpperCase() || 'G'}
            </Text>
          )}
          <View style={styles.editIconContainer}>
            <Ionicons name="pencil" size={12} color="white" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.email || 'Guide'}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#4CAF50" />
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : ratingError ? (
            <Text style={styles.errorText}>{ratingError}</Text>
          ) : (
            <>
              <Text style={styles.rating}>{ratings.averageRating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({ratings.totalReviews} reviews)</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background.paper,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#008080',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    color: '#757575',
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  reviewCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 14,
  },
}); 