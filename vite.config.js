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
  server: { port: 5173 }
})
