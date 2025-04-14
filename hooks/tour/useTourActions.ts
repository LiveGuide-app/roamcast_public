import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Tour, updateTourStatus, TourError } from '@/services/tour';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import appLogger from '@/utils/appLogger';

interface UseTourActionsProps {
  tour?: Tour | null;
  onTourUpdate?: (tour: Tour) => void;
  disconnect?: (shouldCleanup?: boolean) => Promise<void>;
  isGuide?: boolean;
}

export const useTourActions = ({
  tour,
  onTourUpdate,
  disconnect,
  isGuide = false,
}: UseTourActionsProps) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTour = async () => {
    if (!tour) return;
    
    setIsUpdating(true);
    try {
      // Update tour status and set room start time
      const updatedTour = await updateTourStatus(tour.id, 'active');
      await supabase
        .from('tours')
        .update({ room_started_at: new Date().toISOString() })
        .eq('id', tour.id);
      
      // Connect to LiveKit room if provided
      if (disconnect) {
        await disconnect();
      }

      // Notify parent component of the update
      if (onTourUpdate) {
        onTourUpdate(updatedTour);
      }

      return updatedTour;
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to start tour');
        // Revert status on failure
        await updateTourStatus(tour.id, 'pending');
      }
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEndTour = useCallback(async () => {
    try {
      if (!tour?.id) return;

      if (disconnect) {
        await disconnect(isGuide);
      }

      const updatedTour = await updateTourStatus(tour.id, 'completed');
      if (onTourUpdate) {
        onTourUpdate(updatedTour);
      }
    } catch (error) {
      appLogger.logError('Error ending tour:', error instanceof Error ? error : new Error(String(error)));
    }
  }, [isGuide, disconnect, tour?.id, onTourUpdate]);

  const handleCancelTour = () => {
    if (!tour) return;
    
    Alert.alert(
      'Cancel Tour',
      'Are you sure you want to cancel this tour?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: async () => {
            setIsUpdating(true);
            try {
              // Update tour status to cancelled
              const updatedTour = await updateTourStatus(tour.id, 'cancelled');
              
              // Notify parent component of the update
              if (onTourUpdate) {
                onTourUpdate(updatedTour);
              }
              
              // Navigate back to tours list
              router.push('/(guide)/(tabs)/tours');
            } catch (error) {
              if (error instanceof TourError) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Error', 'Failed to cancel tour');
              }
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteTour = async () => {
    if (!tour) return;
    
    Alert.alert(
      'Delete Tour',
      'Are you sure you want to delete this tour? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              const { error } = await supabase
                .from('tours')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', tour.id);
              
              if (error) {
                throw error;
              }
              
              // Navigate back to tours list
              router.push('/(guide)/(tabs)/tours');
            } catch (error) {
              appLogger.logError('Error deleting tour:', error instanceof Error ? error : new Error(String(error)));
              Alert.alert('Error', 'Failed to delete tour. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  return {
    isLoading,
    handleStartTour,
    handleEndTour,
    handleCancelTour,
    handleDeleteTour,
    isUpdating
  };
}; 