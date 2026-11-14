/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ok: '#16a34a',
        watch: '#d97706',
        act: '#dc2626',
      },
    },
  },
  plugins: [],
};
