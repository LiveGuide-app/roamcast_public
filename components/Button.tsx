import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { colors, spacing, borderRadius } from '@/config/theme';
import { ReactNode } from 'react';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger-outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({ 
  title, 
  variant = 'primary',
  size = 'large',
  fullWidth = true,
  style,
  textStyle,
  disabled,
  leftIcon,
  rightIcon,
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
      <View style={styles.content}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <Text style={[
          styles.text, 
          (variant === 'outline' || variant === 'danger-outline') && styles.outlineText,
          variant === 'danger-outline' && styles.dangerText,
          textStyle
        ]}>
          {title}
        </Text>
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
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