import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { colors } from '@/config/theme'

export default function StripeRefresh() {
  const router = useRouter()

  useEffect(() => {
    const refreshOnboarding = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/(auth)')
          return
        }

        // Call the stripe-onboarding function again to get a fresh URL
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-onboarding`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        const { url, error } = await response.json()
        if (error) throw new Error(error)

        // Redirect to the new onboarding URL
        router.replace(url)
      } catch (error) {
        console.error('Error refreshing onboarding:', error)
        router.replace('/(guide)/profile')
      }
    }

    refreshOnboarding()
  }, [router])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Refreshing setup...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.default,
  },
  text: {
    fontSize: 18,
    color: colors.text.primary,
  },
}) 