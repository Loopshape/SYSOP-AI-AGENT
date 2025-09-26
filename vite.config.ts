import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // avoid uv_interface_addresses error in PRoot/Termux
    port: 8888,        // custom port
    open: true,        // auto-open browser when server starts
  },
  build: {
    outDir: 'dist',    // build output folder
    sourcemap: false,  // optional, disable source maps for production
  },
  resolve: {
    alias: {
      '@': '/src',     // optional, allows import from '@/...' to point to /src
    },
  },
});
