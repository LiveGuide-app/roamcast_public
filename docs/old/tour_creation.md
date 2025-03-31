# Tour Creation Implementation Guide

## Overview
This document outlines the implementation approach for tour creation in the Roamcast application. The process involves creating a tour record in Supabase, generating a unique tour code, and setting up the necessary UI components.

## Database Flow
1. User submits tour creation form
2. Backend creates tour record with:
   - Unique 6-digit code
   - Guide ID (from authenticated user)
   - Tour name
   - Initial status ('pending')
3. Returns tour details to frontend
4. Frontend redirects to live tour detail page

## Implementation Steps

### 1. Migrate Live Tour Detail to Dynamic Route
```typescript
// Move from app/(guide)/liveTourDetail.tsx to app/(guide)/[tourId].tsx
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Tour } from '../../services/tour';

export default function LiveTourDetail() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement tour fetching logic
    setIsLoading(false);
  }, [tourId]);

  if (isLoading) {
    return <View><Text>Loading...</Text></View>;
  }

  if (!tour) {
    return <View><Text>Tour not found</Text></View>;
  }

  return (
    <View>
      <Text>Tour: {tour.name}</Text>
      <Text>Code: {tour.unique_code}</Text>
      <Text>Status: {tour.status}</Text>
    </View>
  );
}
```

Update the navigation in create-tour.tsx:
```typescript
// In create-tour.tsx, update the navigation
router.push({
  pathname: '/(guide)/[tourId]',
  params: { tourId: tour.id }
});
```

### 2. Create Tour Service
```typescript
// services/tour.ts
import { supabase } from '../lib/supabase';

export interface CreateTourParams {
  name: string;
}

export interface Tour {
  id: string;
  guide_id: string;
  name: string;
  unique_code: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface TourParticipant {
  id: string;
  tour_id: string;
  device_id: string;
  join_time: string;
  leave_time?: string;
}

export enum TourErrorCode {
  NOT_FOUND = 'TOUR_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_STATUS = 'INVALID_STATUS',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class TourError extends Error {
  constructor(
    message: string, 
    public code: TourErrorCode
  ) {
    super(message);
    this.name = 'TourError';
  }
}

export async function createTour(params: CreateTourParams): Promise<Tour> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new TourError('User not authenticated', TourErrorCode.UNAUTHORIZED);
  }

  const { data, error } = await supabase
    .rpc('create_tour', {
      p_guide_id: user.id,
      p_name: params.name
    });

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new TourError('Tour name already exists', TourErrorCode.INVALID_STATUS);
    }
    throw new TourError('Failed to create tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

export async function getTour(tourId: string): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to fetch tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

export async function updateTourStatus(
  tourId: string, 
  status: Tour['status']
): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .update({ status })
    .eq('id', tourId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to update tour status', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}

export async function joinTour(
  tourId: string, 
  deviceId: string
): Promise<TourParticipant> {
  const { data, error } = await supabase
    .from('tour_participants')
    .insert({
      tour_id: tourId,
      device_id: deviceId
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23503') { // Foreign key violation
      throw new TourError('Tour not found', TourErrorCode.NOT_FOUND);
    }
    throw new TourError('Failed to join tour', TourErrorCode.NETWORK_ERROR);
  }

  return data;
}
```

### 3. Create Loading Component
```typescript
// components/LoadingScreen.tsx
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
```

### 4. Update Live Tour Detail Component
```typescript
// app/(guide)/[tourId].tsx
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Tour, getTour, updateTourStatus } from '../../services/tour';
import { LoadingScreen } from '../../components/LoadingScreen';
import { TourError } from '../../services/tour';

export default function LiveTourDetail() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTour() {
      try {
        const tourData = await getTour(tourId);
        setTour(tourData);
      } catch (error) {
        if (error instanceof TourError) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Error', 'Failed to load tour');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchTour();
  }, [tourId]);

  const handleStartTour = async () => {
    if (!tour) return;
    
    try {
      const updatedTour = await updateTourStatus(tour.id, 'active');
      setTour(updatedTour);
    } catch (error) {
      if (error instanceof TourError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to start tour');
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!tour) {
    return (
      <View style={styles.container}>
        <Text>Tour not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tour: {tour.name}</Text>
      <Text style={styles.code}>Code: {tour.unique_code}</Text>
      <Text style={styles.status}>Status: {tour.status}</Text>
      
      {tour.status === 'pending' && (
        <Button 
          title="Start Tour" 
          onPress={handleStartTour}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  code: {
    fontSize: 18,
    marginBottom: 8
  },
  status: {
    fontSize: 16,
    marginBottom: 16
  }
});
```

### 5. Update Create Tour Component
```typescript
// app/(guide)/create-tour.tsx
import { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { router } from 'expo-router';
import { createTour } from '../../services/tour';

export default function CreateTour() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTour = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a tour name');
      return;
    }

    try {
      setIsLoading(true);
      const tour = await createTour({ name });
      
      // Navigate to live tour detail with tour ID
      router.push({
        pathname: '/(guide)/[tourId]',
        params: { tourId: tour.id }
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create tour'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter tour name"
        value={name}
        onChangeText={setName}
        editable={!isLoading}
      />
      <Button
        title={isLoading ? "Creating..." : "Create Tour"}
        onPress={handleCreateTour}
        disabled={isLoading}
      />
    </View>
  );
}
```

### 6. Add Loading States
```typescript
// components/LoadingButton.tsx
import { ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface LoadingButtonProps {
  onPress: () => void;
  title: string;
  isLoading: boolean;
  disabled?: boolean;
}

export function LoadingButton({ onPress, title, isLoading, disabled }: LoadingButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
```

### 7. Add Error Handling
```typescript
// utils/error-handling.ts
export class TourError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TourError';
  }
}

export function handleTourError(error: unknown): string {
  if (error instanceof TourError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
```

### 8. Add Form Validation
```typescript
// utils/validation.ts
export function validateTourName(name: string): string | null {
  if (!name.trim()) {
    return 'Tour name is required';
  }
  
  if (name.length < 3) {
    return 'Tour name must be at least 3 characters';
  }
  
  if (name.length > 100) {
    return 'Tour name must be less than 100 characters';
  }
  
  return null;
}
```

## Testing

### 1. Unit Tests
```typescript
// __tests__/services/tour.test.ts
import { createTour } from '../../services/tour';

describe('createTour', () => {
  it('should create a tour successfully', async () => {
    const mockTour = {
      id: '123',
      name: 'Test Tour',
      unique_code: '123456',
      status: 'pending'
    };

    // Mock Supabase RPC call
    jest.spyOn(supabase, 'rpc').mockResolvedValue({
      data: mockTour,
      error: null
    });

    const result = await createTour({ name: 'Test Tour' });
    expect(result).toEqual(mockTour);
  });

  it('should throw error if user is not authenticated', async () => {
    // Mock unauthenticated user
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: null
    });

    await expect(createTour({ name: 'Test Tour' }))
      .rejects
      .toThrow('User not authenticated');
  });
});
```

### 2. Integration Tests
```typescript
// __tests__/integration/tour-creation.test.ts
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateTour from '../../app/(guide)/create-tour';

describe('Tour Creation Flow', () => {
  it('should create tour and navigate to detail page', async () => {
    const { getByPlaceholderText, getByText } = render(<CreateTour />);
    
    // Fill in tour name
    fireEvent.changeText(getByPlaceholderText('Enter tour name'), 'Test Tour');
    
    // Submit form
    fireEvent.press(getByText('Create Tour'));
    
    // Verify navigation
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(guide)/[tourId]',
        params: expect.any(Object)
      });
    });
  });
});
```

## Error Scenarios

### 1. Network Errors
- Handle offline state
- Retry failed requests
- Show appropriate error messages

### 2. Validation Errors
- Tour name too short/long
- Invalid characters
- Duplicate tour names

### 3. Rate Limiting
- Handle "Rate limit exceeded" errors
- Show appropriate message to user
- Suggest waiting period

## Security Considerations

### 1. Authentication
- Verify user is authenticated
- Validate user permissions
- Secure API endpoints

### 2. Input Validation
- Sanitize user input
- Validate data types
- Prevent SQL injection

### 3. Rate Limiting
- Implement client-side rate limiting
- Handle server-side rate limits
- Show appropriate messages

## Performance Optimization

### 1. Loading States
- Show loading indicators
- Disable form during submission
- Optimize navigation

### 2. Error Handling
- Graceful degradation
- Clear error messages
- Recovery options

### 3. Data Caching
- Cache tour data
- Optimize re-renders
- Handle stale data

## Next Steps
1. Implement tour detail page
2. Add tour editing functionality
3. Implement tour deletion
4. Add tour sharing features
5. Implement tour analytics 