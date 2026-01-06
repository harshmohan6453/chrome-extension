import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-page-context',
      writeBundle() {
        // Copy pageContext.js to dist root
        copyFileSync(
          resolve(__dirname, 'src/content-scripts/pageContext.js'),
          resolve(__dirname, 'dist/pageContext.js')
        );
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        content: resolve(__dirname, 'src/content-scripts/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          // Only split chunks for popup, not for content scripts
          if (id.includes('node_modules')) {
            if (id.includes('posthog')) {
              return 'posthog';
            }
            if (id.includes('react') || id.includes('framer-motion') || id.includes('zustand')) {
              return 'vendor';
            }
          }
        },
      },
    },
    outDir: 'dist',
  },
});
