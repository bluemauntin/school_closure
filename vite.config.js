import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 학교알리미(schoolinfo.go.kr)는 CORS 헤더가 없어 브라우저 직접 호출 불가 → 프록시
      '/sapi': {
        target: 'https://www.schoolinfo.go.kr',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/sapi/, ''),
      },
    },
  },
})
