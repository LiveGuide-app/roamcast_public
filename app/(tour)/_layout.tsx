import { Stack } from 'expo-router';

type TourStackParamList = {
  '[code]': { code: string };
};

export default function TourLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false
      }}
    />
  );
} 