/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tokyo: {
          bg: '#1a1b26',
          surface: '#24283b',
          cyan: '#7dcfff',
          purple: '#bb9af7',
          text: '#a9b1d6',
        }
      }
    },
  },
  plugins: [],
}
