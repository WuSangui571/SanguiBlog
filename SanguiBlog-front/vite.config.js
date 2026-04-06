import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/appfull/AdminPanel.jsx')) {
            return 'admin-panel'
          }

          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) {
              return 'motion'
            }
            if (
              id.includes('react-markdown')
              || id.includes('remark-')
              || id.includes('rehype-')
              || id.includes('katex')
            ) {
              return 'markdown'
            }
            if (id.includes('lucide-react')) {
              return 'icons'
            }
            return 'vendor'
          }

          return undefined
        }
      }
    }
  },
    // // 新加的为了测试的域名
    // server: {
    //     allowedHosts: [
    //         // 'nonmature-scraggily-fermin.ngrok-free.dev'
    //         'puristic-david-unsorely.ngrok-free.dev'
    //     ],
    //     host: true,
    //     // // 允许 ngrok 域名访问 dev server
    //     // allowedHosts: ['*.ngrok-free.dev', '*.ngrok.app'],
    //     proxy: {
    //         // 所有 /api 开头的请求都转发给本地 8080 的 Spring Boot
    //         '/api': {
    //             target: 'http://localhost:8080',
    //             changeOrigin: true,
    //             // 如果后端不是 /api 开头，而是根路径，可以用 rewrite：
    //             // rewrite: (path) => path.replace(/^\/api/, '')
    //         },
    //         '/uploads': {                    // ⭐ 新增这一块
    //             target: 'http://localhost:8080',
    //             changeOrigin: true,
    //         }
    //     }
    // }
})
