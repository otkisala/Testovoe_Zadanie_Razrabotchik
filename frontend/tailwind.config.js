/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1E8',
        'cream-dark': '#E8E1CE',
        ink: '#0A0A0A',
        'ink-soft': '#1F1F1F',
        coral: '#FF5C2C',
        'coral-dark': '#E84A1A',
        amber: '#F2B705',
        sage: '#7A9B6E',
        slate: '#5B6770',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        brutal: '4px 4px 0 0 #0A0A0A',
        'brutal-lg': '6px 6px 0 0 #0A0A0A',
        'brutal-sm': '2px 2px 0 0 #0A0A0A',
        'brutal-coral': '4px 4px 0 0 #FF5C2C',
      },
      borderWidth: {
        3: '3px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out backwards',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
