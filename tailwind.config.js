/** SkillToSuccess design tokens — sky blue + light orange on white.  Build: npm run build:css */
module.exports = {
  content: ['./*.html', './admin/**/*.{html,js}', './assets/js/**/*.js'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' }, screens: { xl: '1220px' } },
    extend: {
      colors: {
        sky: { 50: '#F1F8FE', 100: '#E1F0FC', 200: '#BCE0F9', 300: '#86C8F3', 400: '#45A8E8', 500: '#1A8FD6', 600: '#0A7BC2', 700: '#075E95', 800: '#0A4C77', 900: '#0C3E61', 950: '#082840' },
        orange: { 50: '#FFF5EB', 100: '#FFE7CF', 200: '#FFD0A3', 300: '#FFB774', 400: '#FF9A3D', 500: '#F27F1B', 600: '#D9680A', 700: '#B4540A', 800: '#8C420B' },
        ink: { 900: '#0C2238', 800: '#17314B', 700: '#2B4560', 600: '#4A5B6E', 500: '#64758A', 400: '#8696A8', 300: '#B3C0CE', 200: '#D3DCE6' },
        line: '#E3EAF2',
        cloud: '#F6F9FC',
        good: { 50: '#ECFAF3', 500: '#14A06B', 600: '#0E8457', 700: '#0B6A46' },
        bad: { 50: '#FEF1F0', 500: '#E0473A', 600: '#C2362B' },
        warn: { 50: '#FFF8E6', 600: '#B7791F' }
      },
      fontFamily: {
        display: ['Lexend', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      fontSize: {
        'display-xl': ['clamp(2.4rem, 1.5rem + 3.4vw, 4.1rem)', { lineHeight: '1.06', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(1.9rem, 1.4rem + 1.8vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.5rem, 1.25rem + 1vw, 2.1rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }]
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,34,56,.05), 0 6px 20px -10px rgba(12,34,56,.12)',
        lift: '0 2px 4px rgba(12,34,56,.05), 0 18px 40px -18px rgba(10,123,194,.35)',
        pop: '0 30px 70px -25px rgba(8,40,64,.4)',
        ring: '0 0 0 4px rgba(10,123,194,.16)'
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } }
      },
      animation: { rise: 'rise .45s cubic-bezier(.2,.7,.2,1) both', pop: 'pop .4s cubic-bezier(.2,.7,.2,1) both' }
    }
  },
  plugins: []
};
