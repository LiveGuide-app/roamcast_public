declare module 'expo-barcode-generator' {
  interface BarCodeGeneratorProps {
    value: string;
    type: 'qr' | 'aztec' | 'codabar' | 'code39' | 'code93' | 'code128' | 'datamatrix' | 'ean8' | 'ean13' | 'itf14' | 'pdf417' | 'upce';
    width?: number;
    height?: number;
  }

  export const BarCodeGenerator: React.FC<BarCodeGeneratorProps>;
} 