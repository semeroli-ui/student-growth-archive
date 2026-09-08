<template>
  <div>
    <header v-if="showTopbar" class="topbar">
      <span style="font-size:22px">📚</span>
      <h1>学生成长档案</h1>
      <span class="spacer"></span>
      <router-link to="/">班级概览</router-link>
      <span class="topbar-divider"></span>
      <span class="user-info">
        <span class="user-avatar">{{ userInfo?.name?.charAt(0) || '?' }}</span>
        <span class="user-name">{{ userInfo?.name || '未登录' }}</span>
        <span class="role-tag">{{ roleLabel }}</span>
      </span>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </header>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isLoggedIn, getUser, getRole, logout } from './api/auth.js'

const route = useRoute()
const router = useRouter()

const showTopbar = computed(() => route.name !== 'login')

const userInfo = computed(() => {
  // 响应式：route 变化时重新读取
  void route.fullPath
  return getUser()
})

const roleLabel = computed(() => {
  const r = getRole()
  return r === 'teacher' ? '教师' : r === 'student' ? '学生' : ''
})

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}
</script>
