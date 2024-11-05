/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        borderRadius: {
          '2xl': '1rem',
        },
        animation: {
          'fadeIn': 'fadeIn 0.2s ease-in-out',
          'slideUp': 'slideUp 0.3s ease-out',
          'spin': 'spin 1s linear infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          }
        },
      },
    },
    plugins: [],
  }