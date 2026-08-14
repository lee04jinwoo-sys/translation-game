import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    proxy: {
      '/tatoeba-api': {
        target: 'https://tatoeba.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tatoeba-api/, '/en/api_v0')
      }
    }
  },
  preview: {
    allowedHosts: true,
    proxy: {
      '/tatoeba-api': {
        target: 'https://tatoeba.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tatoeba-api/, '/en/api_v0')
      }
    }
  }
})
