import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/agent/chat': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/agent/sessions': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
