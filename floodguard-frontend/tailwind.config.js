/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
    extend: {
        colors: {
        brand: {
            50: '#ecf7ff',
            100: '#d6edff',
            200: '#aeddff',
            300: '#7eccff',
            400: '#4db4ff',
            500: '#2196f3',
            600: '#0d7dd9',
            700: '#0a62b0',
            800: '#084e8c',
            900: '#073f72',
        },
        },
        boxShadow: {
        inset: 'inset 0 1px 2px rgba(15,23,42,0.1)',
        },
    },
    },
    plugins: [],
    }
