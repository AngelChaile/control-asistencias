/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        municipio: {
          50: '#fff5f5',
          100: '#ffecec',
          200: '#ffcccc',
          300: '#ff9a9a',
          400: '#ff5f5f',
          500: '#e11d1d',
          600: '#c21a1a',
          700: '#9b1515',
          800: '#7a1010',
          900: '#4c0a0a'
        },
        municipioBlack: '#0b0b0b'
      },
      borderRadius: {
        'lg-xl': '12px'
      }
    }
  }
}