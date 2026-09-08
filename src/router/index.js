import { createRouter, createWebHashHistory } from 'vue-router'
import Landing from '../views/Landing.vue'
import Dashboard from '../views/Dashboard.vue'
import StudentProfile from '../views/StudentProfile.vue'
import Login from '../views/Login.vue'
import Admin from '../views/Admin.vue'
import Register from '../views/Register.vue'
import ParentView from '../views/ParentView.vue'
import { isLoggedIn, getRole } from '../api/auth.js'

const routes = [
  { path: '/', name: 'landing', component: Landing, meta: { public: true, fullscreen: true } },
  { path: '/login', name: 'login', component: Login, meta: { public: true, fullscreen: true } },
  { path: '/register', name: 'register', component: Register, meta: { public: true, fullscreen: true } },
  { path: '/app', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true, role: ['teacher', 'admin', 'student'] } },
  { path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true, role: ['teacher', 'admin'] } },
  { path: '/student/:id', name: 'student', component: StudentProfile, meta: { requiresAuth: true, role: ['teacher', 'admin', 'student'] } },
  { path: '/parent', name: 'parent', component: ParentView, meta: { requiresAuth: true, role: ['parent'] } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局前置守卫：登录态校验 + 角色权限
router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    if (to.name === 'login' && isLoggedIn()) {
      next({ name: getRole() === 'parent' ? 'parent' : 'dashboard' })
    } else {
      next()
    }
    return
  }

  if (!isLoggedIn()) {
    next({ name: 'login' })
    return
  }

  const allowed = to.meta.role
  if (allowed && !allowed.includes(getRole())) {
    next({ name: getRole() === 'parent' ? 'parent' : 'dashboard' })
    return
  }

  next()
})

export default router
