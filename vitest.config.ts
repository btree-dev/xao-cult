import { defineConfig } from 'vitest/config';
import path from 'path';

// happy-dom provides globalThis.crypto.subtle and `window` globals that
// Waku's wasm bindings poke at. Tests stay fast without launching a real browser.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
