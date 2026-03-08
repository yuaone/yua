/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{tsx,ts,jsx,js,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Emoji Override',
          'Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont',
          'Segoe UI', 'Noto Sans KR',
          'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji',
          'sans-serif',
        ],
        mono: [
          'Emoji Override',
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas',
          'Liberation Mono', 'Courier New',
          'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
          'monospace',
        ],
      },
      colors: {
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        wash: 'var(--wash)',
        line: 'var(--line)',
      },
      maxWidth: {
        chat: 'var(--chat-max-w)',
      },
    },
  },
  plugins: [],
};
