// 认证 API 层
// 管理登录、登出、token 存储、角色判断、改密

const USE_WORKER = true   // ← 与 student.js 同步切换
// Pages Functions 同源部署，/api 前缀由后端路由自行 strip
const API_BASE = ''

// ===== Token / Session 管理 =====
const TOKEN_KEY = 'sga_token'
const ROLE_KEY = 'sga_role'
const USER_KEY = 'sga_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY)
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  try { return raw ? JSON.parse(raw) : null } catch { return null }
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

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function saveSession(result, remember) {
  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, result.token)
  store.setItem(ROLE_KEY, result.role)
  store.setItem(USER_KEY, JSON.stringify(result.user))
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
    const u = getUser()
    if (u) {
      u.mustChangePwd = false
      const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage
      store.setItem(USER_KEY, JSON.stringify(u))
    }
    return { success: true }
  }
  return { success: false, error: data.error || '修改失败' }
}

// 是否为家长
export function isParent() {
  return getRole() === 'parent'
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
