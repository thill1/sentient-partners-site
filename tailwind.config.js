/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Homepage (Global Experience. Local Impact.)
        editorial: ['Newsreader', 'Georgia', '"Times New Roman"', 'serif'],
        ui: ['"DM Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F5F7FB',
          100: '#E9EDF6',
          200: '#CDD7EA',
          300: '#A8B9D9',
          400: '#7B92C2',
          500: '#5470AB',
          600: '#3B5590',
          700: '#294074',
          800: '#1A2E5F',
          900: '#0D1F4E',
          950: '#071331',
        },
        ivory: '#F7F5F0',
        // Homepage palette: navy, champagne, ivory, charcoal
        sp: {
          navy: '#0D1F4E',
          deep: '#081433',
          ink: '#1E2430',       // charcoal body text on light
          slate: '#566072',     // secondary text on light (AA on ivory and cream)
          ivory: '#F7F5F0',
          cream: '#FCFBF8',
          line: '#E3DED3',
          champagne: '#DDBF8C',
          'champagne-deep': '#CBA96F',
          bronze: '#7A5C2E',    // champagne as text and linework on light (AA)
          mist: '#C9D3E6',      // body text on navy
        },
        // California Intelligence concept (/#/california) — additive only
        ca: {
          navy: '#0D1F4E',     // Pacific Navy (brand)
          deep: '#060C1C',     // Deep Pacific — technology layer
          fog: '#E6E2DA',      // warm atmospheric neutral
          ivory: '#F7F5F0',    // brand ivory
          granite: '#5F6166',  // muted stone, secondary text on light (AA on ivory and fog)
          stone: '#B9B5AC',    // rules and quiet labels on light
          champagne: '#C8B389',// golden-hour accent, used sparingly
          pacific: '#7C98B8',  // natural Pacific blue for the dark layer
          orange: '#C8452B',   // International Orange: marks, rules, fills
          rust: '#A8371F',     // International Orange as text on light surfaces (AA)
        },
        dark: {
          bg: '#060B1D',
          card: '#0B142E',
          border: '#1A2E5F',
        }
      },
      letterSpacing: {
        'brand': '0.22em',
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'marquee': 'marquee 25s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ca-exposure': 'caExposure 2.8s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'ca-fog': 'caFog 70s ease-in-out infinite alternate',
        'ca-grain': 'caGrain 0.9s steps(6) infinite',
        'ca-fog-loop': 'caFogLoop 110s linear infinite',
        'ca-rise': 'caRise 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) 0.12s both',
        'ca-travel': 'caTravel 5.5s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'ca-travel-x': 'caTravelX 7s cubic-bezier(0.45, 0, 0.55, 1) 1.2s infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        caExposure: {
          '0%': { opacity: '0.35', transform: 'scale(1.06)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
        caRise: {
          '0%': { opacity: '0', transform: 'translateY(22px)', clipPath: 'inset(0 0 100% 0)' },
          '100%': { opacity: '1', transform: 'translateY(0)', clipPath: 'inset(-10% 0 -20% 0)' },
        },
        caFogLoop: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
        caProgress: {
          '0%': { transform: 'scaleX(0)', opacity: '1' },
          '70%': { transform: 'scaleX(1)', opacity: '1' },
          '100%': { transform: 'scaleX(1)', opacity: '0' },
        },
        caTravel: {
          '0%': { top: '0%', opacity: '0' },
          '8%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        caTravelX: {
          '0%': { left: '0%', opacity: '0' },
          '8%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        caGrain: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '20%': { transform: 'translate3d(-3%, 2%, 0)' },
          '40%': { transform: 'translate3d(2%, -3%, 0)' },
          '60%': { transform: 'translate3d(-2%, -1%, 0)' },
          '80%': { transform: 'translate3d(3%, 3%, 0)' },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        caFog: {
          '0%': { transform: 'translate3d(-4%, 0, 0)' },
          '100%': { transform: 'translate3d(4%, 0, 0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      }
    },
  },
  plugins: [],
}
