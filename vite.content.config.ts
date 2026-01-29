import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dedicated config for Content Script to ensure IIFE format
export default defineConfig({
  build: {
    emptyOutDir: false, // Don't delete dist, we want to add to it
    rollupOptions: {
      input: resolve(__dirname, 'src/content-scripts/content.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        extend: true, // Allow extending global variables if needed
        inlineDynamicImports: true, // Force single file
      },
    },
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
