/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            boxShadow: {
                'glow-emerald': '0 10px 25px -20px rgba(16, 185, 129, 0.65)',
            },
        },
    },
    plugins: [],
}
