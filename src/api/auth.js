// 认证 API 层
// 管理登录、登出、token 存储、角色判断、改密

import { ref } from 'vue'

const USE_WORKER = true   // ← 与 student.js 同步切换
// Pages Functions 同源部署，/api 前缀由后端路由自行 strip
const API_BASE = ''

// ===== Token / Session 管理 =====
const TOKEN_KEY = 'sga_token'
const ROLE_KEY = 'sga_role'
const USER_KEY = 'sga_user'

// 会话的运行时唯一真相来源。
//
// 这里必须是响应式的 ref，不能像以前那样每次直接读 localStorage：
// App.vue 顶栏把角色包在 computed 里，而读 localStorage 不会产生任何
// 响应式依赖 → computed 首次求值后被永久缓存，再也不重算。
// 结果是：教师退出后在同一个页面里登录学生账号，姓名会更新（那个 computed
// 里塞了 `void route.fullPath` 硬凑依赖），但角色标签仍停留在「教师」，
// 顶栏还会继续显示教师专属菜单。
const session = ref(readFromStorage())

// 两处存储可能同时存在（旧会话勾了「记住我」写进 localStorage，
// 新会话没勾写进 sessionStorage）。必须整组读同一处，
// 否则会出现「token 是 A、角色是 B」这种最危险的错配。
function pickStore() {
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage
  if (localStorage.getItem(TOKEN_KEY)) return localStorage
  return null
}

function readFromStorage() {
  const store = pickStore()
  if (!store) return { token: '', role: '', user: null }
  let user = null
  try { user = JSON.parse(store.getItem(USER_KEY) || 'null') } catch { user = null }
  return {
    token: store.getItem(TOKEN_KEY) || '',
    role: store.getItem(ROLE_KEY) || '',
    user
  }
}

function clearStores() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function getToken() {
  return session.value.token
}

export function getRole() {
  return session.value.role
}

export function getUser() {
  return session.value.user
}

export function getMustChangePwd() {
  return !!getUser()?.mustChangePwd
}

export function isLoggedIn() {
  return !!getToken()
}

// 是否为教师或管理员（可进入管理后台）
export function isStaff() {
  const r = getRole()
  return r === 'teacher' || r === 'admin'
}

// 是否为家长
export function isParent() {
  return getRole() === 'parent'
}

// 写入登录态。先清空两处存储再写，避免上一账号的残留数据留在另一处，
// 之后任何一次「跨存储回退读取」都会把两个账号拼成一个不存在的身份。
export function setSession(result, remember = true) {
  clearStores()
  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, result.token)
  store.setItem(ROLE_KEY, result.role)
  store.setItem(USER_KEY, JSON.stringify(result.user))
  session.value = { token: result.token, role: result.role, user: result.user }
}

// 局部更新当前用户信息（如改密后清掉 mustChangePwd 标记）
export function patchSessionUser(patch) {
  const current = session.value.user
  if (!current) return
  const next = { ...current, ...patch }
  const store = pickStore() || localStorage
  store.setItem(USER_KEY, JSON.stringify(next))
  session.value = { ...session.value, user: next }
}

export function logout() {
  clearStores()
  session.value = { token: '', role: '', user: null }
}

// 多标签页同步：一个标签页退出/切换账号后，其它标签页立即跟上，
// 避免出现「一个标签页是教师、另一个是学生」的错乱状态。
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || [TOKEN_KEY, ROLE_KEY, USER_KEY].includes(e.key)) {
      session.value = readFromStorage()
    }
  })
}

// ===== 登录请求 =====
export async function login(role, account, password) {
  if (USE_WORKER) {
    const r = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, account, password })
    })
    const data = await r.json()
    if (r.ok && data.success) {
      return { success: true, token: data.token, role: data.role, user: data.user }
    }
    return { success: false, error: data.error || '登录失败' }
  }

  // ===== Mock 模式 =====
  await new Promise(r => setTimeout(r, 600))
  const mockUsers = [
    { role: 'teacher', account: 'teacher', password: '123456', name: '王老师', id: 'T001', className: '高三(2)班' },
    { role: 'admin', account: 'admin', password: '123456', name: '管理员', id: 'A001', className: '全部班级' },
    { role: 'student', account: '2024001', password: '123456', name: '李明', id: '2024001', className: '高三(2)班' },
    { role: 'student', account: '2024002', password: '123456', name: '王芳', id: '2024002', className: '高三(2)班' },
    { role: 'student', account: '2024003', password: '123456', name: '张伟', id: '2024003', className: '高三(2)班' }
  ]
  const user = mockUsers.find(u => u.account === account && u.password === password)
  if (user) {
    const token = btoa(`${user.id}:${Date.now()}:${Math.random()}`)
    return { success: true, token, role: user.role, user: { id: user.id, name: user.name, className: user.className } }
  }
  return { success: false, error: '账号或密码错误' }
}

export async function changePassword(oldPassword, newPassword) {
  const token = getToken()
  const r = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ oldPassword, newPassword })
  })
  const data = await r.json()
  if (r.ok && data.success) {
    // 更新本地会话中的 mustChangePwd 标记
    patchSessionUser({ mustChangePwd: false })
    return { success: true }
  }
  return { success: false, error: data.error || '修改失败' }
}

// 带鉴权的统一请求（返回 { ok, data }，data 为解析后的 JSON）
async function authFetch(path, options = {}) {
  const token = getToken()
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) }
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, data }
}

// ===== 邀请码自助注册（公开）=====
export async function register(payload) {
  const r = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await r.json().catch(() => ({}))
  if (r.ok && data.success) return { success: true, token: data.token, role: data.role, user: data.user }
  return { success: false, error: data.error || '注册失败' }
}

// ===== 邀请码管理（仅管理员）=====
export async function createInviteCodes(payload) {
  return authFetch('/api/admin/invite-codes', { method: 'POST', body: JSON.stringify(payload) })
}
export async function getInviteCodes() {
  return authFetch('/api/admin/invite-codes')
}
export async function revokeInviteCode(code) {
  return authFetch(`/api/admin/invite-codes/${code}`, { method: 'DELETE' })
}

// ===== 家长管理（教师/管理员）=====
export async function createParent(payload) {
  return authFetch('/api/admin/parents', { method: 'POST', body: JSON.stringify(payload) })
}
export async function getParents() {
  return authFetch('/api/admin/parents')
}
export async function linkParentStudent(parentId, studentId) {
  return authFetch('/api/admin/parent-links', { method: 'POST', body: JSON.stringify({ parentId, studentId }) })
}

// ===== 教师编辑/删除（仅管理员）=====
export async function updateTeacher(id, payload) {
  return authFetch(`/api/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}
export async function deleteTeacher(id) {
  return authFetch(`/api/admin/teachers/${id}`, { method: 'DELETE' })
}

// ===== 家长编辑/删除（教师/管理员）=====
export async function updateParent(id, payload) {
  return authFetch(`/api/admin/parents/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}
export async function deleteParent(id) {
  return authFetch(`/api/admin/parents/${id}`, { method: 'DELETE' })
}
