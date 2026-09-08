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
        jdgreen: '#146B4C',
        ink: '#14171A',
        slate: '#6B7480',
        line: '#E6E8EA',
        paper: '#FBFBFA',
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
