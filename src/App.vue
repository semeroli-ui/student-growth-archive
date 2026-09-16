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
      <!-- 全局编辑模式总开关：全站信息编辑入口的唯一闸门。
           放在顶栏而不是某个页面里，所以任何页面都能一眼看到自己是
           只读还是可编辑，不必先猜「编辑按钮藏在哪」。
           OFF = 全站锁定（只读）；ON = 全站各类编辑入口出现。 -->
      <button
        v-if="isStaff"
        class="edit-toggle"
        :class="{ on: editMode }"
        role="switch"
        :aria-checked="String(editMode)"
        :title="editMode
          ? '编辑模式已开启：成绩、评分、作业、学生管理等编辑入口均可用。点击回到只读模式。'
          : '当前为只读模式。点击开启后，全站各类信息编辑入口才会出现。'"
        @click="toggleEditMode"
      >
        <span class="et-track" :class="{ on: editMode }"><span class="et-thumb"></span></span>
        <span class="et-text">{{ editMode ? '编辑模式' : '只读模式' }}</span>
      </button>
      <span class="topbar-divider" v-if="isStaff"></span>
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
import { useEditMode, resetEditMode } from './utils/editMode.js'

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

// 全局编辑模式：开关状态 + 切换。只读身份（学生/家长）看不到这个开关，
// 而且 useEditMode 的 canEdit 里还有一道角色校验，双保险。
const { editMode, toggleEditMode } = useEditMode()

// 从教职工账号切到学生/家长账号时，把编辑态归零，
// 避免「上一个账号留下的编辑权限」被下一个账号继承。
watch(isStaff, v => { if (!v) resetEditMode() })

function handleLogout() {
  resetEditMode()
  logout()
  router.push({ name: 'login' })
}
</script>
