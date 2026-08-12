import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Caraga State University institutional palette
        csu: {
          50: '#eef7f1',
          100: '#d3ebdc',
          200: '#a7d7ba',
          300: '#72bd93',
          400: '#44a271',
          500: '#218455',
          600: '#166b45',
          700: '#125639',
          800: '#0f452f',
          900: '#0b3323',
        },
        gold: {
          400: '#f5c451',
          500: '#e8ad2a',
          600: '#c78e17',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
