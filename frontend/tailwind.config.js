/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        'ink-muted': '#5C5C5C',
        'ink-faint': '#8C8C8C',
        line: '#E5E5E5',
        'line-strong': '#D0D0D0',
        surface: '#FFFFFF',
        canvas: '#FAFAFA',
        accent: {
          DEFAULT: '#1B8FA8',
          dark: '#156D82',
          tint: '#E7F3F6',
        },
        danger: {
          DEFAULT: '#B3261E',
          tint: '#FBEAE9',
        },
        success: {
          DEFAULT: '#1E7A4D',
          tint: '#E8F4ED',
        },
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 1px 0 rgba(0,0,0,0.03)',
        pop: '0 12px 32px -8px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
