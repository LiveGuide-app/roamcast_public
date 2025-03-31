import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { colors } from '@/config/theme'

export default function StripeReturn() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the guide profile page
    router.replace('/(guide)/profile')
  }, [router])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Completing setup...</Text>
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