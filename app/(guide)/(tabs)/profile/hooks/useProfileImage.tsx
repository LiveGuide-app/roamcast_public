import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';

interface UseProfileImageProps {
  userId: string | undefined;
  onImageUpdated: (url: string) => void;
}

export const useProfileImage = ({ userId, onImageUpdated }: UseProfileImageProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleImagePick = async () => {
    if (!userId) {
      console.error('No user ID provided');
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
        
        // Read the file
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Upload to Supabase Storage
        const fileName = `${userId}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, Buffer.from(base64, 'base64'), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        // Update user profile
        const { error: updateError } = await supabase
          .from('users')
          .update({ profile_image_url: publicUrl.publicUrl })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        onImageUpdated(publicUrl.publicUrl);
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error handling image:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  return {
    handleImagePick,
    isUploading,
  };
}; 