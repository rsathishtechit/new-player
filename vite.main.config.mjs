import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['sqlite3', 'electron-updater']
      // electron-updater must be external and available from node_modules at runtime
    }
  }
});
