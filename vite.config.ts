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
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
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
        '/api/v1/categories': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/categories', '/api/categories/list')
        },
        '/api/v1/tags': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/tags', '/api/tags/page?pageNum=1&pageSize=200')
        },
        '/api/v1/sensitive-words': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/sensitive-words', '/api/admin/sensitive-words')
        },
        '/api/v1/articles/feed': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/articles/feed', '/api/articles')
        },
        '/api/v1/articles/admin-published': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/articles/admin-published', '/api/articles')
        },
        '/api/v1/articles/admin-drafts': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/articles/admin-drafts', '/api/articles')
        },
        '/api/v1/articles/detail': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/articles/detail', '/api/articles')
        },
        '/api/v1/access-code/gate': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/access-code/gate', '/api/access-code/1')
        },
        '/api/v1/comments/guest-book': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/comments/guest-book', '/api/comment/list/guest-book')
        },
        '/api/v1/comments/article': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/comments/article', '/api/comment/list')
        },
        '/api/v1/images': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/v1/images', '/api/image/list')
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/v2': {
          target: backendUrl,
          changeOrigin: true,
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