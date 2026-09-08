import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import StudentProfile from '../views/StudentProfile.vue'
import Login from '../views/Login.vue'
import { isLoggedIn, getRole } from '../api/auth.js'

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  { path: '/', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/student/:id', name: 'student', component: StudentProfile, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局前置守卫：未登录跳登录页
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next({ name: 'login' })
  } else if (to.name === 'login' && isLoggedIn()) {
    // 已登录时不让访问登录页
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
