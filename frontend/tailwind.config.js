/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: '#0f172a',
        column: '#1e293b',
        card: '#334155',
      },
    },
  },
  plugins: [],
}
