import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // Limpiar URL para que no tenga doble /api
  let apiUrl = env.VITE_API_URL || '';
  if (apiUrl.endsWith('/api')) {
    apiUrl = apiUrl.substring(0, apiUrl.length - 4);
  }
  if (apiUrl.endsWith('/')) {
    apiUrl = apiUrl.substring(0, apiUrl.length - 1);
  }

  return {
    plugins: [
      vue(),
      createHtmlPlugin({
        minify: true,
        inject: {
          data: {
            title: env.VITE_APP_TITLE,
            description: env.VITE_APP_DESCRIPTION,
            themeColor: env.VITE_THEME_COLOR,
            apiUrl: apiUrl, // ✅ URL limpia (sin /api al final)
          },
        },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest', // ✅ Usar modo inyección
        srcDir: 'src',                // ✅ Carpeta fuente
        filename: 'sw.js',            // ✅ Nombre del archivo
        manifest: {
          name: env.VITE_APP_TITLE,
          short_name: env.VITE_APP_SHORT_NAME,
          description: env.VITE_APP_DESCRIPTION,
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait-primary",
          background_color: env.VITE_BACKGROUND_COLOR,
          theme_color: env.VITE_THEME_COLOR,
          icons: [
            {
              src: "/favicon.ico",
              sizes: "any",
              type: "image/x-icon"
            },
            {
              src: "/android/android-launchericon-192-192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/android/android-launchericon-512-512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
        }
      })
    ],
    server: {
      port: 5173,
      strictPort: false,
      host: '0.0.0.0', // Permitir acceso desde la red
      // Proxy ya no es estrictamente necesario si api.js maneja la URL completa,
      // pero lo dejamos por si acaso se usa /api relativo en algún lugar.
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser'
    },
    publicDir: 'public'  // Asegurar que public/ se copia
  }
})
