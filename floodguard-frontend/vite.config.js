import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    // Dev-server proxy: rewrites /api/* → http://localhost:3000/*
    // Only active during `vite dev` (local / Replit).
    // In production builds (Netlify / Render / Vercel) the frontend uses
    // VITE_API_BASE directly and this proxy is not involved.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    // Emit source maps for easier debugging in production.
    // Set to false to reduce bundle size if preferred.
    sourcemap: false,
    // Ensure the output goes to dist/ (Netlify / Render expect this)
    outDir: 'dist',
  }
})
