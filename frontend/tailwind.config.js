module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'landing-blue': '#06324a',
        'landing-emerald': '#14b8a6'
      },
      animation: {
        fadeIn: "fadeIn 1s ease-in-out",
        gradientMove: "gradientMove 3s ease-in-out infinite alternate",
        bgShift: 'bgShift 12s ease-in-out infinite',
        blob: 'blob 10s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        gradientMove: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bgShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        blob: {
          '0%': { transform: 'translate(0px,0px) scale(1)' },
          '33%': { transform: 'translate(20px,-10px) scale(1.05)' },
          '66%': { transform: 'translate(-20px,10px) scale(0.95)' },
          '100%': { transform: 'translate(0px,0px) scale(1)' }
        }
      },
    },
  },
  plugins: [],
};
