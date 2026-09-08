import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' 让构建产物使用相对路径，CF Pages 子路径/自定义域都能直接打开
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist'
  }
})
