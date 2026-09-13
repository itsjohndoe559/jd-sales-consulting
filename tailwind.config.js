/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        jdred: '#C8202F',
        jdgreen: '#1FAE74',
        ink: '#14171A',
        slate: '#8A93A0',
        line: '#2A2D33',
        paper: '#1C1F24',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'Segoe UI',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
