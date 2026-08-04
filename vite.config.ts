import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // С-3: манифест, установка и офлайн-чтение ленты.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Куда пойти',
        short_name: 'Куда пойти',
        description: 'Наши места, наши походы, наши впечатления.',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0D0D0D',
        theme_color: '#0D0D0D',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Шрифты и MapLibre крупные — иначе не попадут в предкэш.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // С-3: лента читается офлайн. Сначала сеть — данные общие на двоих
            // и устаревшая лента хуже, чем секунда ожидания. Кэш выручает,
            // только когда сети нет вовсе.
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Фотографии неизменяемы: имя содержит UUID, перезаписи не бывает.
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Тайлы карты тоже не меняются неделями.
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 14 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
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
