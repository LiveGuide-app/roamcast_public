import { Stack } from 'expo-router';

export default function GuideLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="create-tour" 
        options={{ 
          title: 'Create Tour',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="[tourId]" 
        options={{ 
          title: 'Tour Details',
          headerShown: false 
        }} 
      />
    </Stack>
  );
} 