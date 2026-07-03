import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#5B4EE8',
          light:   '#EEECFD',
          hover:   '#4A3ED4',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted:   '#F3F2FA',
        },
        brand: {
          bg:   '#F8F7FF',
          text: '#1A1835',
          muted:'#6B6893',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:   '0 1px 4px rgba(91, 78, 232, 0.08)',
        'card-hover': '0 4px 16px rgba(91, 78, 232, 0.12)',
        'card-drag':  '0 12px 40px rgba(91, 78, 232, 0.18)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      animation: {
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite alternate',
      },
      keyframes: {
        'aurora-drift': {
          '0%':   { transform: 'scale(1) translateX(0px) translateY(0px)' },
          '33%':  { transform: 'scale(1.04) translateX(20px) translateY(-10px)' },
          '66%':  { transform: 'scale(0.98) translateX(-15px) translateY(15px)' },
          '100%': { transform: 'scale(1.02) translateX(10px) translateY(-5px)' },
        }
      }
    }
  },
  plugins: [],
}

export default config
