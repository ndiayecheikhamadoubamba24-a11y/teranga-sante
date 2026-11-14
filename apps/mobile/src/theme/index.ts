// Charte Teranga Santé : jaune soleil, vert profond, orange chaud, bleu nuit sur fond crème.
export const colors = {
  sun: '#F5B700',
  green: '#0F6B3E',
  orange: '#F26B1D',
  night: '#14213D',
  cream: '#FFF8EC',
  white: '#FFFFFF',
  muted: '#6B7280',
  danger: '#C62828',
} as const;

export const fonts = {
  regular: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
  black: 'Nunito_900Black',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const spacing = (n: number) => n * 4;
