/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#272643',
          foreground: '#ffffff',
        },
        surface: '#ffffff',
        mint: {
          100: '#e3f6f5',
          200: '#bae8e8',
        },
        accent: '#2c698d',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        card: '0 6px 24px rgba(39, 38, 67, 0.12)',
      },
    },
  },
  plugins: [],
};
