import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#E9DFC3',
        card: '#F8F2E2',
        ink: '#2A2420',
        stamp: '#B0472E',
        accent: '#3F6459',
        warn: '#B9822C',
        loc: {
          bathroom: '#6E8F87',
          kitchen: '#C98F2B',
          laundry: '#7D93A6',
          closet: '#B0472E',
          vanity: '#A9789A',
          bedroom: '#8A8F6E',
          livingroom: '#9C8B5E',
          entrance: '#6F7D5C',
          medicine: '#B0763F',
          car: '#5C7A8B',
        },
      },
      fontFamily: {
        heading: ['"Gowun Batang"', 'serif'],
        body: ['"IBM Plex Sans KR"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
