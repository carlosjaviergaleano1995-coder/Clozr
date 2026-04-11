/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  'rgba(232,0,29,0.08)',
          100: 'rgba(232,0,29,0.12)',
          200: 'rgba(232,0,29,0.20)',
          300: '#ff6b6b',
          400: '#ff3b3b',
          500: '#ff1a1a',
          600: '#E8001D',
          700: '#c4001a',
          800: '#a20018',
          900: '#86001a',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f5f5f5',
          100: '#e8e8e8',
          200: '#3a3a3e',
          300: '#2a2a2e',
          400: '#606068',
          500: '#808088',
          600: '#a0a0a8',
          700: '#c0c0c8',
          800: '#1c1c1e',
          900: '#141414',
          950: '#0a0a0a',
        },
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
        'modal':      '0 24px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        'brand':      '0 4px 20px rgba(232,0,29,0.3)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'fade-in':  'fadeIn  0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                              to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.96)' },    to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
