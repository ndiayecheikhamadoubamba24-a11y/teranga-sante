// Charte Teranga Santé (maquette) : jaune soleil, vert profond, orange chaud, bleu nuit sur fond crème.
export const colors = {
  sun: '#F8B400',
  sunLight: '#FFE7A3',
  green: '#076236',
  greenDark: '#04472A',
  greenLight: '#E3F2E1',
  orange: '#E85A05',
  orangeDark: '#B84702',
  blue: '#1F5FBF',
  blueDark: '#164A97',
  night: '#14213D',
  cream: '#FFF8EC',
  creamDark: '#F6EBD3',
  white: '#FFFFFF',
  muted: '#6B6358',
  border: '#EADFC8',
  red: '#E53935',
  sky: '#5AA9E6',
  skin: '#8D5A3B',
  skinDark: '#6B4026',
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  black: 'Poppins_800ExtraBold',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const spacing = (n: number) => n * 4;

export const shadow = {
  shadowColor: '#5A4520',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;
