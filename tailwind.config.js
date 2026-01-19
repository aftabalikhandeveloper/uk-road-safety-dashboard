/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safety-red': '#dc2626',
        'safety-amber': '#f59e0b',
        'safety-green': '#16a34a',
        'safety-blue': '#2563eb',
      }
    },
  },
  plugins: [],
}
