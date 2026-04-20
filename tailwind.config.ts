import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'monospace'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
      colors: {
        acid: '#C8FF00',
        brutal: '#FF2D00',
        void: '#0A0A0A',
        electric: '#00F5FF',
        warning: '#FFE600',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        flash: {
          '0%, 100%': { backgroundColor: '#FF2D00' },
          '50%': { backgroundColor: '#8B0000' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-8px) rotate(-1deg)' },
          '20%': { transform: 'translateX(8px) rotate(1deg)' },
          '30%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '50%': { transform: 'translateX(-4px)' },
          '60%': { transform: 'translateX(4px)' },
          '70%': { transform: 'translateX(-2px)' },
        },
        pulse_brutal: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '6px 6px 0px #C8FF00' },
          '50%': { transform: 'scale(1.05)', boxShadow: '10px 10px 0px #FF2D00' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        blink: 'blink 0.5s step-end infinite',
        flash: 'flash 0.4s ease-in-out infinite',
        shake: 'shake 0.6s ease-in-out infinite',
        pulse_brutal: 'pulse_brutal 1s ease-in-out infinite',
        scanline: 'scanline 3s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
