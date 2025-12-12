module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html'
  ],
  theme: {
  extend: {
    fontFamily: {
      poppins: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      boldonse: ['var(--font-boldonse)', 'cursive'],
    },
  },
},
  plugins: [],
};
