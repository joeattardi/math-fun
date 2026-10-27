import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/math-fun/',
  server: { host: true },
  build: { chunkSizeWarningLimit: 2500 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon-180.png', 'icons/favicon-64.png'],
      manifest: {
        name: 'Math Fun',
        short_name: 'Math Fun',
        description: 'Silly, encouraging math games.',
        start_url: '/math-fun/',
        scope: '/math-fun/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#2ec4f1',
        theme_color: '#2ec4f1',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
