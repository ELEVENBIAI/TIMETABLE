// Tailwind-Tokens spiegeln DESIGN.md. Konkrete Werte kommen aus tokens.css als CSS-Variablen.
// Diese Config mappt nur die semantischen Namen — Tenant-Theming passiert in den CSS-Files.
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        'surface-sunken': 'var(--color-surface-sunken)',
        border: 'var(--color-border)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        brand: {
          DEFAULT: 'var(--color-brand-primary)',
          primary: 'var(--color-brand-primary)',
          'primary-hover': 'var(--color-brand-primary-hover)',
          'on-primary': 'var(--color-brand-on-primary)',
        },
        status: {
          planned: 'var(--color-status-planned)',
          progress: 'var(--color-status-progress)',
          completed: 'var(--color-status-completed)',
          'completed-soft': 'var(--color-status-completed-soft)',
          'needs-reassign': 'var(--color-status-needs-reassign)',
          'needs-reassign-soft': 'var(--color-status-needs-reassign-soft)',
          conflict: 'var(--color-status-conflict)',
          moved: 'var(--color-status-moved)',
          'moved-soft': 'var(--color-status-moved-soft)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Aus DESIGN.md
        display: ['clamp(1.75rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        headline: ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.005em' }],
        title: ['1rem', { lineHeight: '1.4' }],
        body: ['0.9375rem', { lineHeight: '1.5' }],
        'body-mobile': ['1rem', { lineHeight: '1.5' }],
        label: ['0.8125rem', { lineHeight: '1.3', letterSpacing: '0.01em' }],
        numeric: ['0.875rem', { lineHeight: '1.3' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      spacing: {
        // 4/8/12/16/24/32/48 aus DESIGN.md — Tailwind hat schon 1/2/3/4/6/8/12 als Defaults
        // Hier nur die Sondernamen, die nicht im Default-Mapping enthalten sind.
      },
      boxShadow: {
        // Dezent — Drop-Shadows nur für Floating-Elements (Drag-Toolbar, Dropdowns).
        dropdown: '0 2px 8px -4px rgba(15, 20, 25, 0.08)',
        floating: '0 4px 12px -4px rgba(15, 20, 25, 0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config;
