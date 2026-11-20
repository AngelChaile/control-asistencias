import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Incluir visualizer solo cuando ANALYZE=true
let plugins = [react()];
if (process.env.ANALYZE === 'true') {
  const { visualizer } = require('rollup-plugin-visualizer');
  plugins.push(visualizer({ filename: 'dist/stats.html', open: false }));
}

export default defineConfig({
  plugins,
  // El despliegue de producción usa Firebase Admin a través de las API de Vercel.
  define: process.env.VERCEL_ENV === 'production'
    ? { 'import.meta.env.VITE_SEGURIDAD_ACTIVA': JSON.stringify('true') }
    : {},
  server: { port: 5173 }
})
