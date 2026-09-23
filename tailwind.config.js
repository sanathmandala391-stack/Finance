/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070709',
          900: '#0c0c10',
          850: '#111117',
          800: '#161620',
          750: '#1c1c28',
          700: '#232332',
        },
        gold: {
          50: '#fffdf5',
          100: '#fef9e7',
          200: '#fcf0c3',
          300: '#f9e295',
          400: '#f5cd5a',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 8px -2px rgba(234, 179, 8, 0.05)',
        'card-hover': '0 10px 30px -4px rgba(0, 0, 0, 0.6), 0 4px 16px -2px rgba(234, 179, 8, 0.15)',
        'glow-gold': '0 0 25px -4px rgba(234, 179, 8, 0.4)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.4)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #eab308 50%, #ca8a04 100%)',
        'gold-metallic': 'linear-gradient(135deg, #fef08a 0%, #eab308 30%, #a16207 70%, #fef08a 100%)',
        'dark-card': 'linear-gradient(145deg, #161620 0%, #0e0e13 100%)',
      }
    },
  },
  plugins: [],
}
