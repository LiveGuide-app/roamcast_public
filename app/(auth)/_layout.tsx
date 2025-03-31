import { Stack } from 'expo-router';

type AuthStackParamList = {
  login: undefined;
  signup: undefined;
  verify: undefined;
  'forgot-password': undefined;
  'reset-password': undefined;
};

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#000',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    />
  );
} 