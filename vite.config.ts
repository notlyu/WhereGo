import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // MapLibre грузит свой воркер как ES-модуль; без этого Vite собрал бы его
  // в IIFE и внутренние импорты потерялись бы.
  worker: {
    format: 'es',
  },
  build: {
    // П-1: бандл ≤ 250 КБ gzip. Карта (Этап 3) уезжает в отдельный ленивый чанк.
    chunkSizeWarningLimit: 400,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
