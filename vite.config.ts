/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages la app vive en /TheoreMath/. Localmente se sirve desde la raíz.
const base = process.env.GITHUB_ACTIONS ? '/TheoreMath/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icono.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'TheoreMath',
        short_name: 'TheoreMath',
        description: 'Machete de teoremas y fórmulas en forma de mazo de cartas.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#080d13',
        theme_color: '#080d13',
        icons: [
          { src: 'icons/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Subconjuntos de fuentes que la interfaz en castellano nunca usa.
        globIgnores: ['**/*-cyrillic*', '**/*-vietnamese*', '**/*-greek-ext*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Las dependencias cambian poco: en chunks aparte se cachean entre versiones.
        manualChunks: {
          react: ['react', 'react-dom'],
          katex: ['katex'],
          motion: ['motion/react'],
          zod: ['zod'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
