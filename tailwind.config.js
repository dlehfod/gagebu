/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        // 차콜/뉴트럴 다크 톤 (카드는 배경과의 명도 차이로 구분)
        slate: {
          800: '#1f232c',
          900: '#14171d',
          950: '#0b0d10',
        },
      }
    },
  },
  plugins: [],
}
