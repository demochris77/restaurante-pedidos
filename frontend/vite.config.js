import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0'  // Escuchar en todas las interfaces (importante para red local)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  },
  publicDir: 'public'  // Asegurar que public/ se copia
})
