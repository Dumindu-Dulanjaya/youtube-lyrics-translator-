import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API routes proxy
      '/api': {
        target: 'http://localhost:3001', // Backend server URL
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      // Alternative: If your backend doesn't use /api prefix
      // '/api': {
      //   target: 'http://localhost:3001',
      //   changeOrigin: true,
      //   secure: false,
      //   rewrite: (path) => path.replace(/^\/api/, '')
      // }
    },
    // Optional: Configure CORS headers
    cors: {
      origin: true,
      credentials: true
    },
    // Optional: Set port
    port: 3000,
    // Optional: Open browser automatically
    open: true
  }
})