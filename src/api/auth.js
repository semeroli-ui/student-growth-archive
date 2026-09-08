// 认证 API 层
// 管理登录、登出、token 存储、角色判断

const USE_WORKER = false  // ← 与 student.js 同步切换
const WORKER_URL = ''     // CF Workers URL

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

export function isLoggedIn() {
  return !!getToken()
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(USER_KEY)
}

// ===== 登录请求 =====
export async function login(role, account, password) {
  if (USE_WORKER) {
    // 真实模式：调 Workers /auth/login
    const r = await fetch(`${WORKER_URL}/auth/login`, {
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

  // ===== Mock 模式：本地验证 =====
  await new Promise(r => setTimeout(r, 600)) // 模拟网络延迟

  const mockUsers = [
    // 教师
    { role: 'teacher', account: 'teacher', password: '123456', name: '王老师', id: 'T001', className: '高三(2)班' },
    { role: 'teacher', account: 'admin', password: 'admin', name: '管理员', id: 'A001', className: '全部班级' },
    // 学生
    { role: 'student', account: '2024001', password: '2024001', name: '李明', id: '2024001', className: '高三(2)班' },
    { role: 'student', account: '2024002', password: '2024002', name: '王芳', id: '2024002', className: '高三(2)班' },
    { role: 'student', account: '2024003', password: '2024003', name: '张伟', id: '2024003', className: '高三(2)班' }
  ]

  const user = mockUsers.find(u =>
    u.role === role && u.account === account && u.password === password
  )

  if (user) {
    // 生成简单 mock token
    const token = btoa(`${user.id}:${Date.now()}:${Math.random()}`)
    return {
      success: true,
      token,
      role: user.role,
      user: { id: user.id, name: user.name, className: user.className }
    }
  }

  return { success: false, error: '账号或密码错误' }
}
