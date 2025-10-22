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
  },
  plugins: [],
  safelist: [
    'bg-municipio-50','bg-municipio-100','bg-municipio-200','bg-municipio-300','bg-municipio-400','bg-municipio-500','bg-municipio-600','bg-municipio-700','bg-municipio-800','bg-municipio-900',
    'text-municipio-50','text-municipio-100','text-municipio-200','text-municipio-300','text-municipio-400','text-municipio-500','text-municipio-600','text-municipio-700','text-municipio-800','text-municipio-900',
    'text-municipio-700','bg-municipio-100'
  ]
}
