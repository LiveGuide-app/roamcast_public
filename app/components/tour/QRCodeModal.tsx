import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Modal } from '../shared/Modal';
import { colors, spacing } from '@/config/theme';
import QRCode from 'react-native-qrcode-svg';

type QRCodeModalProps = {
  visible: boolean;
  onClose: () => void;
  tourCode: string;
};

export const QRCodeModal = ({ visible, onClose, tourCode }: QRCodeModalProps) => {
  const joinUrl = `https://join.tryroamcast.com?code=${tourCode}`;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Scan to Join Tour"
    >
      <View style={styles.container}>
        <View style={styles.qrContainer}>
          <QRCode
            value={joinUrl}
            size={250}
            backgroundColor="white"
            color="black"
          />
        </View>
        <Text style={styles.helperText}>
          Scan this QR code with your phone's camera to join the tour
        </Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: 8,
  },
  helperText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
}); 