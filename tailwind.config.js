/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './layouts/**/*.{js,ts,jsx,tsx}',
    './modals/**/*.{js,ts,jsx,tsx}',
    './src/modules/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
    // shadcn/ui lokalt
    './src/components/ui/**/*.{js,ts,jsx,tsx}',
  ],

  safelist: [
    // Baslayouter
    'grid','inline-grid','flex','inline-flex','block','inline-block','hidden',
    'flex-col','flex-row','flex-wrap',
    'items-center','items-start','items-end',
    'justify-center','justify-between','justify-start','justify-end',
    'min-h-screen','h-full','w-full',

    // Radius/skuggor
    'rounded','rounded-md','rounded-lg','rounded-xl',
    'shadow','shadow-sm','shadow-md','shadow-lg',
    'hover:shadow','hover:shadow-md','hover:shadow-lg',

    // Typografi
    'text-xs','text-sm','text-base','text-lg','text-xl','text-2xl','text-3xl','text-4xl',
    'font-medium','font-semibold','font-bold','tracking-tight','leading-tight',
    'text-left','text-center','text-right',

    // Färger (CSS-variabler från shadcn/ui)
    'bg-background','text-foreground',
    'bg-card','text-card-foreground',
    'bg-primary','text-primary-foreground',
    'bg-secondary','text-secondary-foreground',
    'bg-muted','text-muted-foreground',
    'bg-accent','text-accent-foreground',
    'bg-destructive','text-destructive-foreground',
    'bg-popover','text-popover-foreground',
    'border-border','border-input','ring-ring',
    'bg-white','bg-black','text-white','text-black','bg-transparent','text-transparent',

    // Stater & transitions
    'transition','transition-all','transition-colors',
    'duration-150','duration-200','duration-300','ease-in-out','ease-out',
    'hover:bg-accent','hover:text-accent-foreground',
    'hover:bg-muted','hover:text-muted-foreground',
    'hover:bg-secondary','hover:text-secondary-foreground',

    // Vanliga utils
    'ml-auto','mr-auto','h-16','h-auto','col-span-full',
    'p-4','p-6','p-8','px-4','py-2','pt-2','pb-2',
    'mb-2','mb-4','mt-2','mt-4','gap-4','gap-6','space-x-4','space-y-0','space-y-2','space-y-4',

    // Specifika grid klasser för att undvika mönsterproblem
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6', 'grid-cols-12',
    'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4',
    'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-6',
    'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-6',
    
    // Vanliga spacing värden
    'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8',
    'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8',
    'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8',
    'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-8', 'm-auto',
  ],

  prefix: '',
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:{ DEFAULT:'hsl(var(--secondary))', foreground:'hsl(var(--secondary-foreground))' },
        destructive:{ DEFAULT:'hsl(var(--destructive))', foreground:'hsl(var(--destructive-foreground))' },
        muted:{ DEFAULT:'hsl(var(--muted))', foreground:'hsl(var(--muted-foreground))' },
        accent:{ DEFAULT:'hsl(var(--accent))', foreground:'hsl(var(--accent-foreground))' },
        popover:{ DEFAULT:'hsl(var(--popover))', foreground:'hsl(var(--popover-foreground))' },
        card:{ DEFAULT:'hsl(var(--card))', foreground:'hsl(var(--card-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },

  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],

  future: { hoverOnlyWhenSupported: true },
};
