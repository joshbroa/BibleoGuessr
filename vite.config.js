import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      // Scoring and validation live in functions/shared so the client and the
      // Cloud Functions run literally the same code — no drift between what the
      // browser previews and what the server rules on.
      '@shared': path.resolve(process.cwd(), 'functions/shared'),
    },
  },
  server: {
    // Fixed so the Firebase emulator suite and the app always agree on origin.
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    // three/drei are large and only ever needed once the player reaches a game,
    // so they get their own chunk rather than bloating the landing page bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'functions/test/**/*.test.js'],
  },
});
