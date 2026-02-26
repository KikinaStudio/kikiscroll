/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                tenbin: {
                    black: '#000000',
                    dark: '#232121',
                    gray: '#767676',
                    offwhite: '#F0F3F3',
                    white: '#FFFFFF',
                    purple: '#CECAFB',
                    orange: '#F8721D',
                }
            },
            fontFamily: {
                heading: ['"Space Grotesk"', 'sans-serif'],
                body: ['"Space Grotesk"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
