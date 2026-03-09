import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Grayson County Townly',
            short_name: 'Townly',
            description: "Grayson County's Digital Front Porch",
            theme_color: '#ea580c',
            background_color: '#fdfcf8',
            display: 'standalone',
            start_url: '/',
            icons: [
              {
                src: '/images/chair-icon.webp',
                sizes: '192x192',
                type: 'image/webp',
                purpose: 'any',
              },
              {
                src: '/images/chair-icon.webp',
                sizes: '512x512',
                type: 'image/webp',
                purpose: 'any maskable',
              },
            ],
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
