import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/background/service-worker.ts'),
      output: {
        format: 'es',
        entryFileNames: 'background.js',
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
  },
});
