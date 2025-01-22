// /** @type {import('tailwindcss').Config} */
// export default {
//   content: [
//     './pages/**/*.{ts,tsx}',
//     './components/**/*.{ts,tsx}',
//     './app/**/*.{ts,tsx}',
//     './src/**/*.{ts,tsx}',
//   ],
//   darkMode: ['selector', '[data-theme="dark"]'],
//   plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
//   prefix: '',
//   safelist: [
//     'lg:col-span-4',
//     'lg:col-span-6',
//     'lg:col-span-8',
//     'lg:col-span-12',
//     'border-border',
//     'bg-card',
//     'border-error',
//     'bg-error/30',
//     'border-success',
//     'bg-success/30',
//     'border-warning',
//     'bg-warning/30',
//   ],
//   theme: {
//     container: {
//       center: true,
//       padding: {
//         '2xl': '2rem',
//         DEFAULT: '1rem',
//         lg: '2rem',
//         md: '2rem',
//         sm: '1rem',
//         xl: '2rem',
//       },
//       screens: {
//         '2xl': '86rem',
//         lg: '64rem',
//         md: '48rem',
//         sm: '40rem',
//         xl: '80rem',
//       },
//     },
//     extend: {
//       animation: {
//         'accordion-down': 'accordion-down 0.2s ease-out',
//         'accordion-up': 'accordion-up 0.2s ease-out',
//       },
//       borderRadius: {
//         lg: 'var(--radius)',
//         md: 'calc(var(--radius) - 2px)',
//         sm: 'calc(var(--radius) - 4px)',
//       },
//       colors: {
//         accent: {
//           DEFAULT: 'var(--accent)',
//           foreground: 'var(--accent-foreground)',
//         },
//         background: 'var(--background)',
//         border: 'var(--border)',
//         card: {
//           DEFAULT: 'var(--card)',
//           foreground: 'var(--card-foreground)',
//         },
//         destructive: {
//           DEFAULT: 'var(--destructive)',
//           foreground: 'var(--destructive-foreground)',
//         },
//         foreground: 'var(--foreground)',
//         input: 'var(--input)',
//         muted: {
//           DEFAULT: 'var(--muted)',
//           foreground: 'var(--muted-foreground)',
//         },
//         popover: {
//           DEFAULT: 'var(--popover)',
//           foreground: 'var(--popover-foreground)',
//         },
//         primary: {
//           DEFAULT: 'var(--primary)',
//           foreground: 'var(--primary-foreground)',
//         },
//         ring: 'var(--ring)',
//         secondary: {
//           DEFAULT: 'var(--secondary)',
//           foreground: 'var(--secondary-foreground)',
//         },
//         success: 'var(--success)',
//         error: 'var(--error)',
//         warning: 'var(--warning)',
//       },
//       fontFamily: {
//         mono: ['var(--font-geist-mono)'],
//         sans: ['var(--font-geist-sans)'],
//       },
//       keyframes: {
//         'accordion-down': {
//           from: { height: '0' },
//           to: { height: 'var(--radix-accordion-content-height)' },
//         },
//         'accordion-up': {
//           from: { height: 'var(--radix-accordion-content-height)' },
//           to: { height: '0' },
//         },
//       },
//       typography: ({ theme }) => ({
//         DEFAULT: {
//           css: [
//             {
//               '--tw-prose-body': 'var(--text)',
//               '--tw-prose-headings': 'var(--text)',
//               h1: {
//                 fontWeight: 'normal',
//                 marginBottom: '0.25em',
//               },
//             },
//           ],
//         },
//         base: {
//           css: [
//             {
//               h1: {
//                 fontSize: '2.5rem',
//               },
//               h2: {
//                 fontSize: '1.25rem',
//                 fontWeight: 600,
//               },
//             },
//           ],
//         },
//         md: {
//           css: [
//             {
//               h1: {
//                 fontSize: '3.5rem',
//               },
//               h2: {
//                 fontSize: '1.5rem',
//               },
//             },
//           ],
//         },
//       }),
//     },
//   },
// }


/** @type {import('tailwindcss').Config} */
export default {
  darkMode:['selector', '[data-theme="dark"]', '.dark'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  safelist: [
    'lg:col-span-4',
    'lg:col-span-6',
    'lg:col-span-8',
    'lg:col-span-12',
    // 'border-border',
    // 'bg-card',
    // 'border-error',
    // 'bg-error/30',
    // 'border-success',
    // 'bg-success/30',
    // 'border-warning',
    // 'bg-warning/30',
  ],
  theme: {
    container: {
      center: true,
      padding: "none",
      screens: {
        '2xl': '86rem',
        xl: '80rem',
        lg: '64rem',
        md: '48rem',
        sm: '40rem',
        xs: '32rem',
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        bright: "var(--bright)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--text)',
            '--tw-prose-headings': 'var(--text)',
            h1: {
              fontSize: '4rem',
              fontWeight: 'normal',
              marginBottom: '0.25em',
            },
          },
        },
      }),
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}