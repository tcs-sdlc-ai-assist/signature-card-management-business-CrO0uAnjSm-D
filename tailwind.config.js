/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    screens: {
      mobile: '320px',
      tablet: '640px',
      desktop: '1024px',
      widescreen: '1200px',
    },
    extend: {
      colors: {
        'primary-blue': '#00468b',
        body: '#292929',
      },
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};