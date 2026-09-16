<template>
  <div>
    <header v-if="showTopbar" class="topbar">
      <span style="font-size:22px">📚</span>
      <h1>学生成长档案</h1>
      <span class="spacer"></span>
      <router-link v-if="isStaff" to="/app">班级概览</router-link>
      <router-link v-if="isStudent" to="/app">我的档案</router-link>
      <router-link v-if="isStaff" to="/homework">作业管理</router-link>
      <router-link v-if="isParent" to="/parent">我的孩子</router-link>
      <router-link v-if="isStaff" to="/admin">管理</router-link>
      <span class="topbar-divider"></span>
      <span class="user-info">
        <span class="user-avatar">{{ userInfo?.name?.charAt(0) || '?' }}</span>
        <span class="user-name">{{ userInfo?.name || '未登录' }}</span>
        <span class="role-tag">{{ roleLabel }}</span>
      </span>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </header>
    <main :class="route.meta.fullscreen ? 'page-fullscreen' : 'container'">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isLoggedIn, getUser, getRole, logout, isParent as isParentFn } from './api/auth.js'

const route = useRoute()
const router = useRouter()

const showTopbar = computed(() => !route.meta.fullscreen)

// 会话状态来自 auth.js 的响应式 session，登录 / 退出 / 切换账号会立即
// 让下面这些 computed 失效并重算。以前直接读 localStorage（非响应式），
// computed 首次求值后永久缓存，导致切换账号后顶栏角色不更新。
const userInfo = computed(() => getUser())

const isStaff = computed(() => {
  const r = getRole()
  return r === 'teacher' || r === 'admin'
})
const isStudent = computed(() => getRole() === 'student')
const isParent = computed(() => isParentFn())
const roleLabel = computed(() => {
  const r = getRole()
  return r === 'teacher' ? '教师' : r === 'student' ? '学生' : r === 'admin' ? '管理员' : r === 'parent' ? '家长' : ''
})

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}
</script>
