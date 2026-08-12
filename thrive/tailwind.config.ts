import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // Small phones (iPhone SE and narrower Android devices) need their own stop.
        xs: '420px',
      },
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
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          from: { opacity: '0', transform: 'translateY(-14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-left': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-right': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'drawer-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'drawer-out': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(33, 132, 85, 0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgba(33, 132, 85, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(33, 132, 85, 0)' },
        },
        // Slow Ken Burns drift for the hero photograph.
        'hero-zoom': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.08)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-down': 'fade-down 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-left': 'fade-left 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-right': 'fade-right 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'drawer-in': 'drawer-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'drawer-out': 'drawer-out 0.22s cubic-bezier(0.4, 0, 1, 1) both',
        'fade-out': 'fade-out 0.22s ease-in both',
        'grow-x': 'grow-x 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'hero-zoom': 'hero-zoom 24s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};

export default config;
