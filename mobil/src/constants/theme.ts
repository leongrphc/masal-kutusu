export const Colors = {
  primary: {
    50: '#FFF5F0',
    100: '#FFE8DC',
    200: '#FFD1B9',
    300: '#FFB896',
    400: '#FF9D70',
    500: '#FF7F50',
    600: '#E66840',
    700: '#CC5230',
    800: '#B33D20',
    900: '#992910',
  },
  secondary: {
    50: '#F0F4FF',
    100: '#E0E8FF',
    200: '#C7D7FE',
    300: '#A5BBFD',
    400: '#8199FC',
    500: '#6B7FFB',
    600: '#5865F2',
    700: '#4752C4',
    800: '#3C4296',
    900: '#313368',
  },
  warm: {
    50: '#FFFBF5',
    100: '#FFF3E0',
    200: '#FFE7C7',
    300: '#FFD9A3',
    400: '#FFCB80',
    500: '#FFBD5C',
    600: '#F5A623',
    700: '#E08E0B',
    800: '#C67600',
    900: '#AD6200',
  },
  neutral: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },
  success: '#22C55E',
  error: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const LightTheme = {
  background: Colors.primary[50],
  backgroundGradient: [Colors.warm[50], Colors.primary[50], Colors.secondary[50]],
  surface: 'rgba(255,255,255,0.8)',
  surfaceBorder: 'rgba(231,229,228,0.5)',
  text: Colors.neutral[800],
  textSecondary: Colors.neutral[600],
  textMuted: Colors.neutral[500],
  inputBackground: 'rgba(255,255,255,0.9)',
  inputBorder: Colors.neutral[200],
};

export const DarkTheme = {
  background: Colors.neutral[900],
  backgroundGradient: [Colors.neutral[900], Colors.neutral[800], Colors.neutral[900]],
  surface: 'rgba(41,37,36,0.8)',
  surfaceBorder: 'rgba(68,64,60,0.5)',
  text: Colors.neutral[100],
  textSecondary: Colors.neutral[400],
  textMuted: Colors.neutral[500],
  inputBackground: 'rgba(68,64,60,0.9)',
  inputBorder: Colors.neutral[600],
};

export const Fonts = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;
