import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type TourErrorScreenProps = {
  message?: string;
};

export const TourErrorScreen = ({ message = 'Tour not found' }: TourErrorScreenProps) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error.main} />
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.buttonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    backgroundColor: colors.background.paper,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
  },
  message: {
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  buttonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 