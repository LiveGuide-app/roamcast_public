import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { colors } from '@/config/theme';

interface LoadingButtonProps {
  onPress: () => void;
  title: string;
  isLoading: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export function LoadingButton({ 
  onPress, 
  title, 
  isLoading, 
  disabled,
  variant = 'primary',
  size = 'large',
  fullWidth = true,
}: LoadingButtonProps) {
  return (
    <Button
      onPress={onPress}
      title={isLoading ? '' : title}
      disabled={isLoading || disabled}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
    >
      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.text.white} />
        </View>
      )}
    </Button>
  );
}

const styles = StyleSheet.create({
  loader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 