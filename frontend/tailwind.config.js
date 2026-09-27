/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172b',
          900: '#0f172b',
          850: '#141f36',
          800: '#16223d',
          750: '#1d2b4a',
        },
        navy: {
          950: '#0f172b',
          900: '#0f172b',
          800: '#16223d',
          700: '#1e2d4f',
        }
      },
    },
  },
  plugins: [],
}