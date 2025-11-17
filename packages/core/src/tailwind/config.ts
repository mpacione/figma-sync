/**
 * Tailwind config reader
 * Parses tailwind.config.js/ts to extract theme values
 */

export interface TailwindConfig {
  spacing: Record<string, string>;
  colors: Record<string, string>;
  borderRadius: Record<string, string>;
  fontSize: Record<string, string>;
  fontWeight: Record<string, string>;
}

/**
 * Default Tailwind spacing scale (in rem, converted to px)
 */
export const DEFAULT_SPACING: Record<string, number> = {
  '0': 0,
  'px': 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,
};

/**
 * Default Tailwind border radius values
 */
export const DEFAULT_BORDER_RADIUS: Record<string, number> = {
  'none': 0,
  'sm': 2,
  'DEFAULT': 4,
  'md': 6,
  'lg': 8,
  'xl': 12,
  '2xl': 16,
  '3xl': 24,
  'full': 9999,
};

/**
 * Default Tailwind font sizes
 */
export const DEFAULT_FONT_SIZE: Record<string, number> = {
  'xs': 12,
  'sm': 14,
  'base': 16,
  'lg': 18,
  'xl': 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

/**
 * Default Tailwind font weights
 */
export const DEFAULT_FONT_WEIGHT: Record<string, number> = {
  'thin': 100,
  'extralight': 200,
  'light': 300,
  'normal': 400,
  'medium': 500,
  'semibold': 600,
  'bold': 700,
  'extrabold': 800,
  'black': 900,
};

/**
 * Get Tailwind config with defaults
 * For now, we use defaults. In the future, we can parse the actual config file.
 */
export function getTailwindConfig(): TailwindConfig {
  return {
    spacing: Object.fromEntries(
      Object.entries(DEFAULT_SPACING).map(([k, v]) => [k, `${v}px`])
    ),
    colors: {}, // Colors come from design tokens
    borderRadius: Object.fromEntries(
      Object.entries(DEFAULT_BORDER_RADIUS).map(([k, v]) => [k, `${v}px`])
    ),
    fontSize: Object.fromEntries(
      Object.entries(DEFAULT_FONT_SIZE).map(([k, v]) => [k, `${v}px`])
    ),
    fontWeight: Object.fromEntries(
      Object.entries(DEFAULT_FONT_WEIGHT).map(([k, v]) => [k, String(v)])
    ),
  };
}

