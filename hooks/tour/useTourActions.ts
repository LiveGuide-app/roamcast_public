import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Tour, updateTourStatus, TourError } from '@/services/tour';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

interface UseTourActionsProps {
  tour: Tour | null;
  connect?: () => Promise<any>;
  disconnect?: () => Promise<void>;
  onTourUpdate?: (tour: Tour) => void;
}

export const useTourActions = ({ 
  tour, 
  connect, 
  disconnect,
  onTourUpdate 
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
      if (connect) {
        await connect();
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

  const handleEndTour = async () => {
    if (!tour) return;
    
    setIsUpdating(true);
    try {
      // First disconnect from LiveKit room if provided
      if (disconnect) {
        await disconnect();
      }
      
      // Update tour status and set room finish time
      const updatedTour = await updateTourStatus(tour.id, 'completed');
      await supabase
        .from('tours')
        .update({ room_finished_at: new Date().toISOString() })
        .eq('id', tour.id);
      
      // Notify parent component of the update
      if (onTourUpdate) {
        onTourUpdate(updatedTour);
      }

      return updatedTour;
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to end tour');
      }
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

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
              console.error('Error deleting tour:', error);
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