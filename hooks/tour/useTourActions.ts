import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Tour, updateTourStatus, TourError } from '@/services/tour';
import { Alert } from 'react-native';

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

  const handleStartTour = async () => {
    if (!tour) return;
    
    setIsUpdating(true);
    try {
      // Update tour status and connect to room
      const updatedTour = await updateTourStatus(tour.id, 'active');
      
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
      
      // Then update tour status
      const updatedTour = await updateTourStatus(tour.id, 'completed');
      
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
          onPress: () => router.push('/(guide)/(tabs)/tours')
        }
      ]
    );
  };

  return {
    handleStartTour,
    handleEndTour,
    handleCancelTour,
    isUpdating
  };
}; 