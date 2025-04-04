import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger-outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({ 
  title, 
  variant = 'primary',
  size = 'large',
  fullWidth = true,
  style,
  textStyle,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      <Text style={[
        styles.text, 
        (variant === 'outline' || variant === 'danger-outline') && styles.outlineText,
        variant === 'danger-outline' && styles.dangerText,
        textStyle
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    minHeight: 56,
  },
  primary: {
    backgroundColor: colors.primary.main,
  },
  secondary: {
    backgroundColor: colors.secondary.main,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  'danger-outline': {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  small: {
    padding: spacing.sm,
  },
  medium: {
    padding: spacing.md,
  },
  large: {
    padding: spacing.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.7,
  },
  text: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  outlineText: {
    color: colors.primary.main,
  },
  dangerText: {
    color: colors.error.main,
  },
}); 