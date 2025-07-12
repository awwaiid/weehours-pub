/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/web/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mud-dark': '#1a1a1a',
        'mud-light': '#2d2d2d',
        'mud-green': '#00ff00',
        'mud-cyan': '#00ffff',
        'mud-yellow': '#ffff00',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}