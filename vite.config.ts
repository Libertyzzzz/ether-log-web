import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8080'
  console.log('当前代理目标地址:', backendUrl)

  return {
    plugins: [
      vue(),
      VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '尘埃 - Dust',
        short_name: 'Dust',
        description: '数字化遗产管理工具',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ],
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      },
      devOptions: {
        enabled: true
      }
    })
    ],
    
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api/quant': {
          target: env.VITE_QUANT_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: mode !== 'development'
        },
        '/v2': {
          target: backendUrl,
          changeOrigin: true,
          secure: mode !== 'development'
        }
      }
    },

    build: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2018',
      cssCodeSplit: true,
      esbuildOptions: {
        drop: mode !== 'development' ? ['console', 'debugger'] : [],
        legalComments: 'none',
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
          },
        },
      },
    },
  }
})