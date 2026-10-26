import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Файлы на диске Windows (/mnt/d): inotify не работает, нужен polling.
    watch: { usePolling: !!process.env.CHOKIDAR_USEPOLLING },
    port: 5173,
    proxy: {
      // Фронт зовёт /api/..., бэкенд живёт на корне (/questions, /packages).
      // Срезаем /api, чтобы пути совпали без правок бэкенда.
      '/api': {
        target: process.env.API_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})