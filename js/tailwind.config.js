/* Tailwind Play CDN theme (external file so the CSP needs no inline scripts) */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0a0f1f', 900: '#0f1629', 850: '#131b33', 800: '#18223f', 700: '#223056', 600: '#2d3d6b' },
        brand: { 300: '#9db8ff', 400: '#6f95ff', 500: '#4b76ff', 600: '#3659e0' },
        accent: { 400: '#ffa25c', 500: '#ff8a3d', 600: '#f06f1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
  },
};
