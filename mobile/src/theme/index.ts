export const colors = {
  brand900: '#0f0f0f',
  brand800: '#1a1a1a',
  brand700: '#262626',
  brand100: '#f4f4f0',
  white: '#ffffff',
  black: '#000000',
  white10: 'rgba(255,255,255,0.1)',
  white20: 'rgba(255,255,255,0.2)',
  white5: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.1)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#9ca3af',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const fonts = {
  sans: 'Inter', // loaded via expo-font if not preloaded
  fallback: 'system-ui',
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
};
