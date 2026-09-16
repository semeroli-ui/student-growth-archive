import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' 让构建产物使用相对路径，CF Pages 子路径/自定义域都能直接打开
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // 把体积大且很少变动的依赖拆成独立 chunk：
        // 1) 主包变小，首屏解析更快；2) 升级业务代码时 vendor 命中浏览器缓存，不必重新下载
        manualChunks: {
          vue: ['vue', 'vue-router'],
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers']
        }
      }
    },
    // echarts chunk 仍在 500KB 以上，这是按需引入后的正常体积，调高阈值避免每次构建都刷警告
    chunkSizeWarningLimit: 700
  }
})
