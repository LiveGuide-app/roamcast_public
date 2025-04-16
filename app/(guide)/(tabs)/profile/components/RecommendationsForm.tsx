import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Linking } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';

interface RecommendationsFormProps {
  recommendationsLink: string | null;
  isLoading?: boolean;
  onSave: (link: string) => void;
  onDelete?: () => void;
}

export const RecommendationsForm: React.FC<RecommendationsFormProps> = ({
  recommendationsLink,
  isLoading = false,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(!recommendationsLink);
  const [link, setLink] = useState(recommendationsLink || '');

  // Update state when props change (addresses persistence issue when navigating)
  useEffect(() => {
    setLink(recommendationsLink || '');
    setIsEditing(!recommendationsLink);
  }, [recommendationsLink]);

  const handleSave = () => {
    const trimmedLink = link.trim();
    if (!trimmedLink) {
      // If link is empty after trimming, treat as delete
      handleDelete();
      return;
    }
    
    // Make sure the link has a protocol
    const formattedLink = trimmedLink.startsWith('http') 
      ? trimmedLink 
      : `https://${trimmedLink}`;
      
    onSave(formattedLink);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else {
      // If no delete handler provided, clear the link and show input
      setLink('');
      onSave('');
      setIsEditing(true);
    }
  };

  const formatLink = (url: string) => {
    // Truncate long links for display
    if (url.length > 40) {
      return url.substring(0, 37) + '...';
    }
    return url;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommendations</Text>
      <Text style={styles.sectionDescription}>
        You can add a link to a document such as a google sheet or pdf with recommendations that will be shown to your guests after the tour. If you leave it blank, the recommendations will not be shown.
      </Text>

      {isEditing ? (
        // Editing mode - show input field
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter your recommendations link"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#008080" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        // Display mode - show the link with options
        <View style={styles.linkContainer}>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => Linking.openURL(link)}
          >
            <Ionicons name="link" size={16} color={colors.primary.main} style={styles.linkIcon} />
            <Text style={styles.linkText} numberOfLines={1}>{formatLink(link)}</Text>
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={18} color={colors.primary.main} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={18} color={colors.error.main} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background.default,
  },
  saveButton: {
    alignSelf: 'flex-end',
    opacity: 1,
  },
  saveButtonText: {
    color: '#008080',
    fontSize: 16,
    fontWeight: '500',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkIcon: {
    marginRight: spacing.sm,
  },
  linkText: {
    color: colors.primary.main,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
}); 