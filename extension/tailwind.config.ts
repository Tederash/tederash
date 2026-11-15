import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        fg: 'var(--color-fg)',
        'fg-muted': 'var(--color-fg-muted)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        'accent-fg': 'var(--color-accent-fg)',
        danger: 'var(--color-danger)',
        'danger-fg': 'var(--color-danger-fg)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        focus: 'var(--color-focus)',
        // shadcn-style aliases (components/ui/thinking-prompt-input) mapped onto the theme tokens
        background: 'var(--color-bg)',
        foreground: 'var(--color-fg)',
        card: 'var(--color-surface)',
        muted: { DEFAULT: 'var(--color-surface-elevated)', foreground: 'var(--color-fg-muted)' },
        primary: { DEFAULT: 'var(--color-accent)', foreground: 'var(--color-accent-fg)' },
        ring: 'var(--color-focus)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: '9999px',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        dyslexic: ['var(--font-dyslexic)'],
      },
      spacing: {
        target: '2.75rem', // 44px minimum interactive target size
      },
    },
  },
  plugins: [],
};

export default config;
