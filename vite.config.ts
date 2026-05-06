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
      registerType: 'autoUpdate', // 自动更新 Service Worker
      manifest: {
        name: '尘埃 - Dust',
        short_name: 'Dust',
        description: '数字化遗产管理工具',
        theme_color: '#ffffff', // 建议配合你的极简白背景
        icons: [
          {
            src: 'pwa-192x192.png', // 需放在 public 目录下
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        display: 'standalone', // 关键：隐藏浏览器地址栏，模拟原生 App
        start_url: '/',
      },
      devOptions: {
        enabled: true // 开发环境也开启，方便你调试
      }
    })
    ],
    
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: mode !== 'development'
        }
      }
    }
  }
})
