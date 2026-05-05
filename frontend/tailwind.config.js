/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f172a',
          foreground: '#ffffff',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        card: '0 6px 24px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
