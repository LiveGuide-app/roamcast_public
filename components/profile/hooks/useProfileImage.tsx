import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import appLogger from '@/utils/appLogger';

interface UseProfileImageProps {
  userId: string | undefined;
  onImageUpdated: (url: string) => void;
}

export const useProfileImage = ({ userId, onImageUpdated }: UseProfileImageProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImagePick = async () => {
    if (!userId) {
      appLogger.logError('No user ID provided', new Error('Missing userId parameter'));
      return;
    }

    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      // Early return if user cancelled
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      try {
        setIsUploading(true);
        const imageUri = result.assets[0].uri;
        const fileName = `${userId}-${Date.now()}.jpg`;
        
        // Get Supabase storage URL with presigned URL for direct upload
        const { data } = await supabase.storage.from('profile-images').createSignedUploadUrl(fileName);
        
        if (!data) {
          throw new Error('Failed to get upload URL');
        }
        
        appLogger.logInfo('Uploading image', { fileName, signedUrl: !!data.signedUrl });
        
        // Upload file directly using Expo's FileSystem
        const uploadResult = await FileSystem.uploadAsync(data.signedUrl, imageUri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': 'image/jpeg'
          }
        });
        
        if (uploadResult.status !== 200) {
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        if (!publicUrl || !publicUrl.publicUrl) {
          throw new Error('Failed to get public URL for uploaded image');
        }

        // Update user profile
        const { error: updateError } = await supabase
          .from('users')
          .update({ profile_image_url: publicUrl.publicUrl })
          .eq('id', userId);

        if (updateError) {
          appLogger.logError('User profile update error', new Error(updateError.message || 'Unknown update error'));
          throw updateError;
        }

        onImageUpdated(publicUrl.publicUrl);
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      // Log error details
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      appLogger.logError('Error handling image upload', error instanceof Error ? error : new Error(errorMessage), {
        errorType: typeof error,
        errorJSON: JSON.stringify(error)
      });
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  return {
    handleImagePick,
    isUploading,
  };
}; 