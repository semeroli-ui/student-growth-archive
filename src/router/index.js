import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import StudentProfile from '../views/StudentProfile.vue'

// 用 hash 路由：CF Pages 静态托管无需额外 _redirects 配置即可刷新不 404
const routes = [
  { path: '/', name: 'dashboard', component: Dashboard },
  { path: '/student/:id', name: 'student', component: StudentProfile }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
