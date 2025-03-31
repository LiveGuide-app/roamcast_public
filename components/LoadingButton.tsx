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

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120
  },
  disabled: {
    opacity: 0.5
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
}); 