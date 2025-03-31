import { Stack } from 'expo-router'

export default function StripeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="return"
        options={{
          title: 'Setup Complete',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="refresh"
        options={{
          title: 'Refreshing Setup',
          headerShown: false,
        }}
      />
    </Stack>
  )
} 