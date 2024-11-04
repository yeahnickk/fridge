/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        borderRadius: {
          '2xl': '1rem',
        },
        animation: {
          'spin': 'spin 1s linear infinite',
        },
      },
    },
    plugins: [],
  }