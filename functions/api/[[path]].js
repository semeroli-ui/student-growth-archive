/**
 * Student Growth Archive — CF Pages Functions API
 * 全部路由逻辑从 Worker src/index.js 移植，入口适配 Pages Functions 签名。
 * 路由前缀: /api/* （由 Pages 静态文件规则 /functions/api/* 映射）
 */

// ===== 工具函数 =====
function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

function normalizeClassName(name) {
  if (!name) return name
  return String(name)
    .replace(/\uFF08/g, '(').replace(/\uFF09/g, ')')
    .replace(/\uFE5F/g, '(').replace(/\uFF5F/g, ')')
    .trim()
}

async function sha256(text) {
  const buf = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomToken() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function extractToken(request) {
  const auth = request.headers.get('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

async function authenticate(request, env) {
  const token = extractToken(request)
  if (!token) return null
  const sessionData = await env.SESSIONS.get(`session:${token}`)
  if (!sessionData) return null
  try { return JSON.parse(sessionData) } catch { return null }
}

async function requireAuth(request, env) {
  const user = await authenticate(request, env)
  if (!user) return { user: null, response: jsonResp({ error: '未登录或登录已过期' }, 401) }
  return { user, response: null }
}

async function requireTeacher(request, env) {
  const { user, response } = await requireAuth(request, env)
  if (response) return { user: null, response }
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { user: null, response: jsonResp({ error: '需要教师或管理员权限' }, 403) }
  }
  return { user, response: null }
}

async function requireAdmin(request, env) {
  const { user, response } = await requireAuth(request, env)
  if (response) return { user: null, response }
  if (user.role !== 'admin') {
    return { user: null, response: jsonResp({ error: '需要管理员权限' }, 403) }
  }
  return { user, response: null }
}

async function requireParent(request, env) {
  const { user, response } = await requireAuth(request, env)
  if (response) return { user: null, response }
  if (user.role !== 'parent') {
    return { user: null, response: jsonResp({ error: '需要家长权限' }, 403) }
  }
  return { user, response: null }
}

// ===== 科目库（覆盖小学到高中常见科目）=====
const SUBJECTS = [
  '语文', '数学', '英语', '音乐', '美术', '体育', '道法', '科学',
  '物理', '化学', '生物', '历史', '地理', '政治', '信息技术', '通用技术'
]

// 科目列表（公开元数据）
async function handleListSubjects() {
  return jsonResp(SUBJECTS)
}

// ===== D1 查询函数 =====

async function dbGetStudents(env, className, onlyId) {
  let query = `SELECT u.id, u.name, u.class_name, u.role FROM users u WHERE u.role = 'student'`
  let params = []
  // onlyId：学生端只能取自己这一条（班级名单属于教师/管理员的管理数据）
  if (onlyId) {
    query += ` AND u.id = ?`
    params.push(onlyId)
  } else if (className && className !== '全部班级') {
    query += ` AND u.class_name = ?`
    params.push(className)
  }
  query += ` ORDER BY u.id`
  const { results } = await env.DB.prepare(query).bind(...params).all()

  const students = []
  for (const s of results) {
    const lastExam = await env.DB.prepare(
      `SELECT exam_name, subject, score, images FROM scores WHERE student_id = ? ORDER BY id DESC LIMIT 3`
    ).bind(s.id).all()

    const homework = await env.DB.prepare(
      `SELECT total, missed, rate FROM homework WHERE student_id = ?`
    ).bind(s.id).first()

    const examMap = {}
    for (const r of lastExam.results || []) {
      if (!examMap[r.exam_name]) examMap[r.exam_name] = { exam: r.exam_name }
      examMap[r.exam_name][r.subject] = r.score
    }
    const lastExamObj = Object.values(examMap).pop() || {}

    students.push({
      id: s.id,
      name: s.name,
      className: s.class_name,
      lastExam: lastExamObj,
      homeworkRate: homework ? homework.rate : 0
    })
  }
  return students
}

async function dbGetStudent(env, id) {
  const user = await env.DB.prepare(
    `SELECT id, name, class_name, role FROM users WHERE id = ? AND role = 'student'`
  ).bind(id).first()
  if (!user) return null

  const { results: scoreRows } = await env.DB.prepare(
    `SELECT exam_name, subject, score, images FROM scores WHERE student_id = ? ORDER BY id`
  ).bind(id).all()

  const examMap = {}
  for (const r of scoreRows) {
    if (!examMap[r.exam_name]) examMap[r.exam_name] = { exam: r.exam_name, _images: {} }
    examMap[r.exam_name][r.subject] = r.score
    try { examMap[r.exam_name]._images[r.subject] = JSON.parse(r.images || '[]') } catch { examMap[r.exam_name]._images[r.subject] = [] }
  }
  const scores = Object.values(examMap)

  const homework = await env.DB.prepare(
    `SELECT total, missed, rate FROM homework WHERE student_id = ?`
  ).bind(id).first() || { rate: 0, missed: 0, total: 0 }

  // 作业明细（明细模型启用后才有数据；表尚未创建时静默降级为空数组）
  let homeworkDetail = []
  try {
    const { results: hwRows } = await env.DB.prepare(
      `SELECT ha.id AS id, ha.title AS title, ha.subject AS subject, ha.due_date AS dueDate,
              hr.status AS status, hr.note AS note
       FROM homework_records hr
       JOIN homework_assignments ha ON ha.id = hr.assignment_id
       WHERE hr.student_id = ?
       ORDER BY ha.due_date DESC, ha.id DESC
       LIMIT 15`
    ).bind(id).all()
    homeworkDetail = (hwRows || []).map(r => ({
      id: r.id,
      title: r.title,
      subject: r.subject,
      dueDate: r.dueDate,
      status: r.status,
      note: r.note || ''
    }))
  } catch { homeworkDetail = [] }

  const behaviorRow = await env.DB.prepare(
    `SELECT raise_hand, focus, cooperation, homework_quality FROM behavior WHERE student_id = ?`
  ).bind(id).first()

  const behavior = behaviorRow ? {
    举手: behaviorRow.raise_hand,
    专注: behaviorRow.focus,
    合作: behaviorRow.cooperation,
    作业质量: behaviorRow.homework_quality
  } : {}

  const { results: events } = await env.DB.prepare(
    `SELECT event_date as date, event_type as type, content FROM events WHERE student_id = ? ORDER BY event_date`
  ).bind(id).all()

  const aiReportRow = await env.DB.prepare(
    `SELECT report_json FROM ai_reports WHERE student_id = ? ORDER BY generated_at DESC LIMIT 1`
  ).bind(id).first()
  let aiReport = null
  if (aiReportRow) {
    try { aiReport = JSON.parse(aiReportRow.report_json) } catch {}
  }

  return {
    id: user.id,
    name: user.name,
    className: user.class_name,
    scores,
    homework,
    homeworkDetail,
    behavior,
    events,
    aiReport
  }
}

// ===== Handler 函数 =====

// ===== 账号 CRUD（编辑/删除）=====

// 编辑学生（教师/管理员）
async function handleUpdateStudent(request, env, actor, id) {
  const { name, className, resetPassword } = await request.json()
  if (!name || !className) return jsonResp({ error: '姓名、班级为必填' }, 400)
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`).bind(id).first()
  if (!exists) return jsonResp({ error: '学生不存在' }, 404)

  const normalizedClass = normalizeClassName(className)
  await env.DB.prepare(`UPDATE users SET name = ?, class_name = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(name, normalizedClass, id).run()

  if (resetPassword) {
    const newPwd = String(resetPassword).trim()
    if (newPwd.length < 6) return jsonResp({ error: '新密码至少 6 位' }, 400)
    const hash = await sha256(newPwd)
    await env.DB.prepare(`UPDATE users SET password_hash = ?, must_change_pwd = 1 WHERE id = ?`).bind(hash, id).run()
  }
  return jsonResp({ success: true })
}

// 删除学生（教师/管理员，级联删除关联数据）
async function handleDeleteStudent(request, env, actor, id) {
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`).bind(id).first()
  if (!exists) return jsonResp({ error: '学生不存在' }, 404)
  await env.DB.prepare(`DELETE FROM scores WHERE student_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM behavior WHERE student_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM homework WHERE student_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM events WHERE student_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM ai_reports WHERE student_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM parent_links WHERE student_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()
  return jsonResp({ success: true })
}

// 编辑教师（管理员）
async function handleUpdateTeacher(request, env, admin, id) {
  const { name, className, role, resetPassword } = await request.json()
  if (!name || !className) return jsonResp({ error: '姓名、班级为必填' }, 400)
  const r = (role === 'admin') ? 'admin' : 'teacher'
  if (id === admin.id && r !== 'admin') {
    return jsonResp({ error: '不能将自身降级为教师' }, 400)
  }
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role IN ('teacher','admin')`).bind(id).first()
  if (!exists) return jsonResp({ error: '教师不存在' }, 404)
  const normalizedClass = normalizeClassName(className)
  await env.DB.prepare(`UPDATE users SET name = ?, class_name = ?, role = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(name, normalizedClass, r, id).run()
  if (resetPassword) {
    const newPwd = String(resetPassword).trim()
    if (newPwd.length < 6) return jsonResp({ error: '新密码至少 6 位' }, 400)
    const hash = await sha256(newPwd)
    await env.DB.prepare(`UPDATE users SET password_hash = ?, must_change_pwd = 1 WHERE id = ?`).bind(hash, id).run()
  }
  return jsonResp({ success: true })
}

// 删除教师（管理员）
async function handleDeleteTeacher(request, env, admin, id) {
  if (id === admin.id) return jsonResp({ error: '不能删除当前登录账号' }, 400)
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role IN ('teacher','admin')`).bind(id).first()
  if (!exists) return jsonResp({ error: '教师不存在' }, 404)
  await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()
  return jsonResp({ success: true })
}

// 编辑家长（教师/管理员）
async function handleUpdateParent(request, env, actor, id) {
  const { name, resetPassword, studentIds } = await request.json()
  if (!name) return jsonResp({ error: '姓名为必填' }, 400)
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'parent'`).bind(id).first()
  if (!exists) return jsonResp({ error: '家长不存在' }, 404)
  await env.DB.prepare(`UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?`).bind(name, id).run()
  if (resetPassword) {
    const newPwd = String(resetPassword).trim()
    if (newPwd.length < 6) return jsonResp({ error: '新密码至少 6 位' }, 400)
    const hash = await sha256(newPwd)
    await env.DB.prepare(`UPDATE users SET password_hash = ?, must_change_pwd = 1 WHERE id = ?`).bind(hash, id).run()
  }
  if (Array.isArray(studentIds)) {
    await env.DB.prepare(`DELETE FROM parent_links WHERE parent_id = ?`).bind(id).run()
    for (const sid of studentIds) {
      await env.DB.prepare(`INSERT OR IGNORE INTO parent_links (id, parent_id, student_id) VALUES (?, ?, ?)`)
        .bind('PL_' + randomToken().slice(0, 10), id, sid).run()
    }
  }
  return jsonResp({ success: true })
}

// 删除家长（教师/管理员，级联 parent_links）
async function handleDeleteParent(request, env, actor, id) {
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'parent'`).bind(id).first()
  if (!exists) return jsonResp({ error: '家长不存在' }, 404)
  await env.DB.prepare(`DELETE FROM parent_links WHERE parent_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()
  return jsonResp({ success: true })
}

async function handleLogin(request, env) {
  const { account, password } = await request.json()
  if (!account || !password) return jsonResp({ error: '请输入账号和密码' }, 400)

  const user = await env.DB.prepare(
    `SELECT id, account, password_hash, role, name, class_name, must_change_pwd
     FROM users WHERE account = ?`
  ).bind(account).first()

  if (!user) return jsonResp({ error: '账号不存在' }, 401)
  const hash = await sha256(password)
  if (hash !== user.password_hash) return jsonResp({ error: '密码错误' }, 401)

  const token = randomToken()
  const sessionUser = {
    id: user.id, name: user.name, role: user.role,
    className: user.class_name, mustChangePwd: !!user.must_change_pwd
  }
  await env.SESSIONS.put(
    `session:${token}`, JSON.stringify(sessionUser),
    { expirationTtl: 7 * 24 * 3600 }
  )

  return jsonResp({ success: true, token, role: user.role, user: sessionUser })
}

async function handleLogout(request, env) {
  const token = extractToken(request)
  if (token) await env.SESSIONS.delete(`session:${token}`)
  return jsonResp({ success: true })
}

async function handleMe(request, env) {
  const user = await authenticate(request, env)
  if (!user) return jsonResp({ error: '未登录' }, 401)
  return jsonResp({ user })
}

async function handleChangePassword(request, env, user) {
  const { oldPassword, newPassword } = await request.json()
  if (!oldPassword || !newPassword) return jsonResp({ error: '请填写原密码和新密码' }, 400)
  if (String(newPassword).length < 6) return jsonResp({ error: '新密码至少 6 位' }, 400)

  const row = await env.DB.prepare(`SELECT password_hash FROM users WHERE id = ?`).bind(user.id).first()
  if (!row) return jsonResp({ error: '用户不存在' }, 404)
  if ((await sha256(oldPassword)) !== row.password_hash) {
    return jsonResp({ error: '原密码不正确' }, 400)
  }

  const newHash = await sha256(newPassword)
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, must_change_pwd = 0, updated_at = datetime('now') WHERE id = ?`
  ).bind(newHash, user.id).run()

  const updated = { ...user, mustChangePwd: false }
  await env.SESSIONS.put(`session:${extractToken(request)}`, JSON.stringify(updated), {
    expirationTtl: 7 * 24 * 3600
  })

  return jsonResp({ success: true })
}

async function handleCreateTeacher(request, env, admin) {
  const { account, name, password, role, className } = await request.json()
  if (!account || !name || !password || !className) {
    return jsonResp({ error: '工号、姓名、初始密码、班级均为必填' }, 400)
  }
  const r = (role === 'admin') ? 'admin' : 'teacher'
  if (account === 'admin' && r !== 'admin') {
    return jsonResp({ error: '保留账号名不可用' }, 400)
  }

  const normalizedClass = normalizeClassName(className)
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE account = ?`).bind(account).first()
  if (exists) return jsonResp({ error: '该工号已存在' }, 409)

  const hash = await sha256(password)
  await env.DB.prepare(
    `INSERT INTO users (id, account, password_hash, role, name, class_name, status, must_change_pwd, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)`
  ).bind(account, account, hash, r, name, normalizedClass, admin.id).run()

  return jsonResp({
    success: true,
    user: { id: account, account, name, role: r, className: normalizedClass, status: 'active', mustChangePwd: true }
  })
}

async function handleListTeachers(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, account, name, role, class_name, status, created_at
     FROM users WHERE role IN ('teacher','admin') ORDER BY role DESC, id`
  ).all()
  return jsonResp(results)
}

async function handleRegister(request, env) {
  const { code, account, name, password, className } = await request.json()
  if (!code || !account || !name || !password) return jsonResp({ error: '邀请码、工号、姓名、密码均为必填' }, 400)
  if (String(password).length < 6) return jsonResp({ error: '密码至少 6 位' }, 400)

  const inv = await env.DB.prepare(`SELECT * FROM invite_codes WHERE code = ?`).bind(code).first()
  if (!inv) return jsonResp({ error: '邀请码无效' }, 400)
  if (inv.used) return jsonResp({ error: '邀请码已被使用' }, 400)
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) return jsonResp({ error: '邀请码已过期' }, 400)

  const r = inv.role === 'admin' ? 'admin' : 'teacher'
  const cls = (className && String(className).trim()) || inv.class_name || ''
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE account = ?`).bind(account).first()
  if (exists) return jsonResp({ error: '该工号已存在' }, 409)

  const hash = await sha256(password)
  await env.DB.prepare(
    `INSERT INTO users (id, account, password_hash, role, name, class_name, status, must_change_pwd, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)`
  ).bind(account, account, hash, r, name, cls || null, 'invite:' + code).run()

  if (cls) {
    await env.DB.prepare(`INSERT OR IGNORE INTO classrooms (id, name, owner_id) VALUES (?, ?, ?)`)
      .bind('C_' + cls, cls, account).run()
  }

  await env.DB.prepare(`UPDATE invite_codes SET used = 1, used_by = ?, used_at = datetime('now') WHERE code = ?`)
    .bind(account, code).run()

  const token = randomToken()
  const sessionUser = { id: account, name, role: r, className: cls, mustChangePwd: true }
  await env.SESSIONS.put(`session:${token}`, JSON.stringify(sessionUser), { expirationTtl: 7 * 24 * 3600 })
  return jsonResp({ success: true, token, role: r, user: sessionUser })
}

async function handleCreateInviteCodes(request, env, admin) {
  const { role = 'teacher', className, count = 1, expiresInDays = 30 } = await request.json()
  const n = Math.min(Math.max(parseInt(count) || 1, 1), 20)
  const r = role === 'admin' ? 'admin' : 'teacher'
  const expires = new Date(Date.now() + expiresInDays * 864e5).toISOString()
  const codes = []
  for (let i = 0; i < n; i++) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const c = randomToken().slice(0, 8).toUpperCase()
      try {
        await env.DB.prepare(
          `INSERT INTO invite_codes (id, code, role, class_name, created_by, used, expires_at)
           VALUES (?, ?, ?, ?, ?, 0, ?)`
        ).bind('IC_' + randomToken().slice(0, 12), c, r, className || null, admin.id, expires).run()
        codes.push(c)
        break
      } catch { /* 唯一冲突重试 */ }
    }
  }
  return jsonResp({ success: true, codes })
}

async function handleListInviteCodes(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT code, role, class_name, used, used_by, created_at, expires_at FROM invite_codes ORDER BY created_at DESC`
  ).all()
  return jsonResp(results)
}

async function handleRevokeInviteCode(request, env, code) {
  await env.DB.prepare(`DELETE FROM invite_codes WHERE code = ? AND used = 0`).bind(code).run()
  return jsonResp({ success: true })
}

async function handleCreateParent(request, env, user) {
  const { account, name, password, studentIds } = await request.json()
  if (!account || !name || !password) return jsonResp({ error: '账号、姓名、密码均为必填' }, 400)
  if (String(password).length < 6) return jsonResp({ error: '密码至少 6 位' }, 400)

  const exists = await env.DB.prepare(`SELECT id FROM users WHERE account = ?`).bind(account).first()
  if (exists) return jsonResp({ error: '该账号已存在' }, 409)

  const hash = await sha256(password)
  await env.DB.prepare(
    `INSERT INTO users (id, account, password_hash, role, name, class_name, status, must_change_pwd, created_by)
     VALUES (?, ?, ?, 'parent', ?, NULL, 'active', 1, ?)`
  ).bind(account, account, hash, name, user.id).run()

  for (const sid of (Array.isArray(studentIds) ? studentIds : [])) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO parent_links (id, parent_id, student_id) VALUES (?, ?, ?)`
    ).bind('PL_' + randomToken().slice(0, 10), account, sid).run()
  }
  return jsonResp({ success: true, user: { id: account, account, name } })
}

async function handleListParents(request, env) {
  const { results: parents } = await env.DB.prepare(
    `SELECT id, account, name FROM users WHERE role = 'parent' ORDER BY name`
  ).all()
  const out = []
  for (const p of parents) {
    const { results: links } = await env.DB.prepare(
      `SELECT u.id, u.name, u.class_name FROM parent_links pl JOIN users u ON u.id = pl.student_id WHERE pl.parent_id = ?`
    ).bind(p.id).all()
    out.push({ id: p.id, account: p.account, name: p.name, children: links })
  }
  return jsonResp(out)
}

async function handleLinkParent(request, env, user) {
  const { parentId, studentId } = await request.json()
  if (!parentId || !studentId) return jsonResp({ error: '缺少参数' }, 400)
  await env.DB.prepare(
    `INSERT OR IGNORE INTO parent_links (id, parent_id, student_id) VALUES (?, ?, ?)`
  ).bind('PL_' + randomToken().slice(0, 10), parentId, studentId).run()
  return jsonResp({ success: true })
}

async function handleParentChildren(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.name, u.class_name FROM parent_links pl JOIN users u ON u.id = pl.student_id WHERE pl.parent_id = ? ORDER BY u.class_name, u.id`
  ).bind(user.id).all()
  return jsonResp(results)
}

async function handleParentStudent(request, env, user, studentId) {
  const link = await env.DB.prepare(
    `SELECT 1 FROM parent_links WHERE parent_id = ? AND student_id = ?`
  ).bind(user.id, studentId).first()
  if (!link) return jsonResp({ error: '无权查看该学生' }, 403)
  const student = await dbGetStudent(env, studentId)
  if (!student) return jsonResp({ error: '未找到该学生' }, 404)
  delete student.aiReport
  return jsonResp(student)
}

async function handleCreateStudent(request, env, teacher) {
  const { account, name, className, password } = await request.json()
  if (!account || !name || !className) {
    return jsonResp({ error: '学号、姓名、班级均为必填' }, 400)
  }
  const normalizedClass = normalizeClassName(className)
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE account = ?`).bind(account).first()
  if (exists) return jsonResp({ error: '该学号已存在' }, 409)

  const pwd = password && String(password).length >= 1 ? password : account
  const hash = await sha256(pwd)
  await env.DB.prepare(
    `INSERT INTO users (id, account, password_hash, role, name, class_name, status, must_change_pwd, created_by)
     VALUES (?, ?, ?, 'student', ?, ?, 'active', 1, ?)`
  ).bind(account, account, hash, name, normalizedClass, teacher.id).run()

  await env.DB.prepare(
    `INSERT OR IGNORE INTO classrooms (id, name, owner_id) VALUES (?, ?, ?)`
  ).bind('C_' + normalizedClass, normalizedClass, teacher.id).run()

  return jsonResp({
    success: true,
    user: { id: account, account, name, className: normalizedClass, status: 'active', mustChangePwd: true }
  })
}

async function handleFixClassNames(request, env) {
  try {
    const { results: users } = await env.DB.prepare(`SELECT id, class_name FROM users`).all()
    const fwRe = /[\uFF08\uFF09]/
    const fixedUsers = []
    for (const u of users) {
      if (fwRe.test(u.class_name)) {
        const n = normalizeClassName(u.class_name)
        await env.DB.prepare(`UPDATE users SET class_name = ? WHERE id = ?`).bind(n, u.id).run()
        fixedUsers.push({ id: u.id, from: u.class_name, to: n })
      }
    }
    const { results: rooms } = await env.DB.prepare(`SELECT id, name FROM classrooms`).all()
    const fixedRooms = []
    for (const r of rooms) {
      if (fwRe.test(r.name)) {
        const n = normalizeClassName(r.name)
        await env.DB.prepare(`UPDATE classrooms SET name = ? WHERE id = ?`).bind(n, r.id).run()
        fixedRooms.push({ id: r.id, from: r.name, to: n })
      }
    }
    return jsonResp({ success: true, fixedUsers, fixedRooms,
      fixedUserCount: fixedUsers.length, fixedRoomCount: fixedRooms.length })
  } catch (e) {
    return jsonResp({ error: 'fix failed: ' + e.message }, 500)
  }
}

async function handleImportStudents(request, env, teacher) {
  const { students } = await request.json()
  if (!Array.isArray(students) || students.length === 0) {
    return jsonResp({ error: '没有可导入的学生数据' }, 400)
  }

  let created = 0, skipped = 0
  const errors = []
  const fwRe = /[\uFF08\uFF09]/

  for (let i = 0; i < students.length; i++) {
    const row = students[i]
    const account = String(row.account || '').trim()
    const name = String(row.name || '').trim()
    // className ignored - forced to teacher.className
    // 导入时额外清理全角括号
    const className = teacher.className
    if (!account || !name || !className) {
      errors.push({ row: i + 1, account, reason: '学号/姓名/班级 任一为空' })
      continue
    }
    const exists = await env.DB.prepare(`SELECT id FROM users WHERE account = ?`).bind(account).first()
    if (exists) { skipped++; continue }

    const pwd = (row.password && String(row.password).length >= 1) ? String(row.password) : account
    const hash = await sha256(pwd)
    try {
      await env.DB.prepare(
        `INSERT INTO users (id, account, password_hash, role, name, class_name, status, must_change_pwd, created_by)
         VALUES (?, ?, ?, 'student', ?, ?, 'active', 1, ?)`
      ).bind(account, account, hash, name, className, teacher.id).run()
      await env.DB.prepare(
        `INSERT OR IGNORE INTO classrooms (id, name, owner_id) VALUES (?, ?, ?)`
      ).bind('C_' + className, className, teacher.id).run()
      created++
    } catch (e) {
      errors.push({ row: i + 1, account, reason: '写入失败: ' + e.message })
    }
  }
  return jsonResp({ success: true, created, skipped, errors, total: students.length })
}

async function handleListClassrooms(request, env, user) {
  if (user.role === 'admin') {
    const { results } = await env.DB.prepare(`SELECT name FROM classrooms ORDER BY name`).all()
    return jsonResp(results.map(r => r.name))
  }
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT class_name FROM users WHERE role='student' AND class_name = ?`
  ).bind(user.className).all()
  return jsonResp(results.map(r => r.class_name).filter(Boolean))
}

async function handleAIReport(request, env, user) {
  const { studentId } = await request.json()
  if (user.role === 'student' && user.id !== studentId) {
    return jsonResp({ error: '无权查看其他学生档案' }, 403)
  }

  const student = await dbGetStudent(env, studentId)
  if (!student) return jsonResp({ error: '未找到该学生' }, 404)

  const AI_SYSTEM_PROMPT = `你是一位资深的班主任兼学习分析师。请根据学生的学业数据、课堂行为数据和历史事件，生成一份个性化的成长档案报告。

要求：
1. 严格基于提供的数据分析，不编造数据
2. 语言温暖但客观，避免空话套话
3. 关注学生的进步趋势和潜在风险
4. 建议要具体可执行，不要笼统的"努力学习"
5. 家校沟通话术要口语化，适合直接发给家长

请严格按照以下 JSON 格式输出（不要包含 markdown 代码块标记，直接输出 JSON）：
{
  "profile": "学生整体画像，2-3句话概括趋势和特点",
  "weaknesses": [{ "subject": "科目或方面", "reason": "具体问题描述，含数据引用" }],
  "suggestions": ["具体可执行的建议1", "建议2", "建议3"],
  "talkScript": "给家长的一段话，口语化，100字以内"
}`

  const dataSummary = {
    姓名: student.name, 班级: student.className,
    成绩记录: student.scores, 作业情况: student.homework,
    课堂行为: student.behavior, 重要事件: student.events
  }

  try {
    const agnesUrl = env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1'
  const resp = await fetch(`${agnesUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AGNES_API_KEY}`
      },
      body: JSON.stringify({
        model: env.AGNES_MODEL,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: `请根据以下学生数据生成成长档案报告：\n\n${JSON.stringify(dataSummary, null, 2)}` }
        ],
        temperature: 0.7, max_tokens: 2000
      })
    })

    if (!resp.ok) {
      return jsonResp({ error: `AI 服务返回 ${resp.status}` }, 502)
    }

    const data = await resp.json()
    let content = (data.choices?.[0]?.message?.content || '').trim()
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let report
    try { report = JSON.parse(content) }
    catch { report = { profile: content, weaknesses: [], suggestions: [], talkScript: '', _parseError: true } }

    await env.DB.prepare(
      `INSERT INTO ai_reports (student_id, report_json) VALUES (?, ?)`
    ).bind(studentId, JSON.stringify(report)).run()

    return jsonResp({ ...report, _source: 'ai' })
  } catch (err) {
    return jsonResp({ error: 'AI 服务异常: ' + err.message }, 500)
  }
}

async function handleAddScore(request, env, studentId) {
  const { exam_name, subject, score, images } = await request.json()
  if (!exam_name || !subject || score === undefined) return jsonResp({ error: '缺少参数' }, 400)
  const imagesJson = Array.isArray(images) ? JSON.stringify(images.slice(0, 3)) : '[]'
  await env.DB.prepare(
    `INSERT OR REPLACE INTO scores (student_id, exam_name, subject, score, images) VALUES (?, ?, ?, ?, ?)`
  ).bind(studentId, exam_name, subject, score, imagesJson).run()
  return jsonResp({ success: true })
}

async function handleAddEvent(request, env, studentId) {
  const { event_date, event_type, content } = await request.json()
  if (!event_date || !event_type || !content) return jsonResp({ error: '缺少参数' }, 400)
  await env.DB.prepare(
    `INSERT INTO events (student_id, event_date, event_type, content) VALUES (?, ?, ?, ?)`
  ).bind(studentId, event_date, event_type, content).run()
  return jsonResp({ success: true })
}

async function handleDeleteEvent(request, env, studentId) {
  const url = new URL(request.url)
  const event_date = url.searchParams.get('event_date')
  const event_type = url.searchParams.get('event_type')
  const content = url.searchParams.get('content')
  if (!event_date || !event_type || !content) return jsonResp({ error: '缺少参数' }, 400)
  await env.DB.prepare(
    `DELETE FROM events WHERE student_id = ? AND event_date = ? AND event_type = ? AND content = ?`
  ).bind(studentId, event_date, event_type, content).run()
  return jsonResp({ success: true })
}

async function handleImportScores(request, env, teacher) {
  const { scores } = await request.json()
  if (!Array.isArray(scores) || scores.length === 0) {
    return jsonResp({ error: '没有可导入的成绩数据' }, 400)
  }

  let imported = 0, skipped = 0, errors = []

  for (let i = 0; i < scores.length; i++) {
    const row = scores[i]
    const studentId = String(row['学号'] || row['id'] || '').trim()
    const examName = String(row['考试名称'] || row['exam_name'] || row['考试'] || '').trim()
    const subject = String(row['科目'] || row['subject'] || '').trim()
    const score = parseFloat(row['分数'] || row['score'] || row['成绩'] || 0)

    if (!studentId || !examName || !subject || isNaN(score)) {
      errors.push({ row: i + 1, data: row, reason: '学号/考试名称/科目/分数 任一为空或无效' })
      continue
    }

    // 验证学生是否存在且在教师班级
    const student = await env.DB.prepare(
      `SELECT id FROM users WHERE id = ? AND role = 'student' AND class_name = ?`
    ).bind(studentId, teacher.className).first()
    if (!student) {
      errors.push({ row: i + 1, studentId, reason: '学生不存在或不在本班' })
      skipped++
      continue
    }

    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO scores (student_id, exam_name, subject, score) VALUES (?, ?, ?, ?)`
      ).bind(studentId, examName, subject, score).run()
      imported++
    } catch (e) {
      errors.push({ row: i + 1, studentId, reason: '写入失败: ' + e.message })
    }
  }

  return jsonResp({ success: true, imported, skipped, errors, total: scores.length })
}

// ===== 课堂行为评分编辑 =====
// 教师保存学生行为四维评分（0-5）：raise_hand 举手 / focus 专注 / cooperation 合作 / homework_quality 作业质量
async function handleUpdateBehavior(request, env, teacher, studentId) {
  // 学生必须存在
  const target = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`).bind(studentId).first()
  if (!target) return jsonResp({ error: '学生不存在' }, 404)

  let body
  try { body = await request.json() } catch { return jsonResp({ error: '请求体无效' }, 400) }

  // 验证并收集字段
  const fields = ['raise_hand', 'focus', 'cooperation', 'homework_quality']
  const values = {}
  for (const f of fields) {
    if (body[f] !== undefined) {
      const v = Number(body[f])
      if (isNaN(v) || v < 0 || v > 5) {
        return jsonResp({ error: f + ' 必须在 0-5 之间' }, 400)
      }
      values[f] = v
    }
  }
  if (Object.keys(values).length === 0) {
    return jsonResp({ error: '没有提供需要更新的字段' }, 400)
  }

  // UPSERT：如果存在则更新，否则插入
  const existing = await env.DB.prepare(
    `SELECT student_id FROM behavior WHERE student_id = ?`
  ).bind(studentId).first()

  if (existing) {
    await env.DB.prepare(`
      UPDATE behavior SET
        raise_hand = COALESCE(?, raise_hand),
        focus = COALESCE(?, focus),
        cooperation = COALESCE(?, cooperation),
        homework_quality = COALESCE(?, homework_quality),
        updated_at = datetime('now')
      WHERE student_id = ?
    `).bind(
      values.raise_hand ?? null,
      values.focus ?? null,
      values.cooperation ?? null,
      values.homework_quality ?? null,
      studentId
    ).run()
  } else {
    await env.DB.prepare(`
      INSERT INTO behavior (student_id, raise_hand, focus, cooperation, homework_quality)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      studentId,
      values.raise_hand ?? 0,
      values.focus ?? 0,
      values.cooperation ?? 0,
      values.homework_quality ?? 0
    ).run()
  }

  return jsonResp({ success: true })
}

// ===== 作业提交情况编辑 =====
// 教师录入/更新学生作业提交统计：total 应交次数，missed 未交次数，rate 自动计算
async function handleUpdateHomework(request, env, teacher, studentId) {
  const target = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`).bind(studentId).first()
  if (!target) return jsonResp({ error: '学生不存在' }, 404)

  let body
  try { body = await request.json() } catch { return jsonResp({ error: '请求体无效' }, 400) }

  const total = Number(body.total)
  const missed = Number(body.missed)
  if (!Number.isInteger(total) || total < 0) return jsonResp({ error: '应交次数必须是不小于 0 的整数' }, 400)
  if (!Number.isInteger(missed) || missed < 0) return jsonResp({ error: '未交次数必须是不小于 0 的整数' }, 400)
  if (missed > total) return jsonResp({ error: '未交次数不能超过应交次数' }, 400)

  const rate = total === 0 ? 0 : (total - missed) / total

  // UPSERT
  const existing = await env.DB.prepare(
    `SELECT student_id FROM homework WHERE student_id = ?`
  ).bind(studentId).first()

  if (existing) {
    await env.DB.prepare(
      `UPDATE homework SET total = ?, missed = ?, rate = ?, updated_at = datetime('now') WHERE student_id = ?`
    ).bind(total, missed, rate, studentId).run()
  } else {
    await env.DB.prepare(
      `INSERT INTO homework (student_id, total, missed, rate) VALUES (?, ?, ?, ?)`
    ).bind(studentId, total, missed, rate).run()
  }

  return jsonResp({ success: true, rate })
}

// ===== 作业明细模型（每次作业 × 每人提交状态）=====
// 解决的问题：汇总式 total/missed 只能回答「提交率多少」，
// 无法回答「这次作业谁没交」。明细模型以「一次作业」为粒度记录每个人的状态，
// 再把结果回写 homework 汇总表，使班级概览、家长端、AI 报告口径保持一致。
//
// 状态：submitted 已交 / late 补交 / missing 未交 / exempt 免交 / pending 待标记
// 提交率口径：已交 = submitted + late，应交 = 已交 + missing（pending/exempt 不计入分母）

const HOMEWORK_STATUSES = ['submitted', 'late', 'missing', 'exempt', 'pending']
const HW_STATUS_LABELS = { submitted: '已交', late: '补交', missing: '未交', exempt: '免交', pending: '待标记' }
const HW_STATUS_ALIASES = {
  'submitted': 'submitted', '已交': 'submitted', '提交': 'submitted', '已提交': 'submitted', '完成': 'submitted',
  '是': 'submitted', 'y': 'submitted', 'yes': 'submitted', '1': 'submitted', 'true': 'submitted',
  'late': 'late', '补交': 'late', '迟交': 'late', '补': 'late',
  'missing': 'missing', '未交': 'missing', '没交': 'missing', '缺交': 'missing', '未完成': 'missing',
  '否': 'missing', 'n': 'missing', 'no': 'missing', '0': 'missing', 'false': 'missing',
  'exempt': 'exempt', '免交': 'exempt', '免': 'exempt', '请假': 'exempt',
  'pending': 'pending', '待标记': 'pending', '未标记': 'pending'
}

function normalizeHomeworkStatus(v) {
  const raw = String(v ?? '').trim()
  const key = raw.toLowerCase()
  return HW_STATUS_ALIASES[key] ?? HW_STATUS_ALIASES[raw] ?? null
}

// 日期归一化：接受 2026/9/1、2026.9.1、2026-9-1 → 2026-09-01
function normalizeDate(v) {
  const s = String(v ?? '').trim().replace(/[.／/]/g, '-')
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function placeholders(n) {
  return new Array(n).fill('?').join(',')
}

// 建表：D1 没有迁移框架，采用「首次使用时建表」，
// 让新功能部署后零手工步骤即可用（建表语句同时归档在 schema/homework-detail.sql）
const HOMEWORK_DDL = [
  `CREATE TABLE IF NOT EXISTS homework_assignments (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     class_name TEXT NOT NULL,
     subject TEXT NOT NULL DEFAULT '',
     title TEXT NOT NULL,
     due_date TEXT NOT NULL,
     note TEXT DEFAULT '',
     created_by TEXT,
     created_at TEXT DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS homework_records (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     assignment_id INTEGER NOT NULL,
     student_id TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     note TEXT DEFAULT '',
     updated_at TEXT DEFAULT (datetime('now'))
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_hw_asg_uniq ON homework_assignments (class_name, subject, title, due_date)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_hw_rec_uniq ON homework_records (assignment_id, student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_hw_rec_student ON homework_records (student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_hw_asg_class ON homework_assignments (class_name, due_date)`
]

let __hwTablesReady = false
async function ensureHomeworkTables(env) {
  if (__hwTablesReady) return
  for (const sql of HOMEWORK_DDL) {
    await env.DB.prepare(sql).run()
  }
  __hwTablesReady = true
}

// 班级维度的可见范围：管理员可跨班（class= 空 → 全部），教师仅限本人班级
function resolveHomeworkScope(user, url) {
  const q = String(url.searchParams.get('class') || '').trim()
  if (user.role === 'admin') {
    return (!q || q === '全部班级') ? null : normalizeClassName(q)
  }
  return user.className ? normalizeClassName(user.className) : null
}

function assertHomeworkScope(user, className) {
  if (user.role === 'admin') return null
  if (normalizeClassName(user.className || '') !== normalizeClassName(className || '')) {
    return jsonResp({ error: '只能操作自己负责的班级' }, 403)
  }
  return null
}

async function dbGetClassStudents(env, className) {
  const { results } = await env.DB.prepare(
    `SELECT id, name FROM users WHERE role = 'student' AND class_name = ? ORDER BY id`
  ).bind(className).all()
  return results || []
}

async function upsertHomeworkSummary(env, studentId, total, missed) {
  const rate = total === 0 ? 0 : (total - missed) / total
  const existing = await env.DB.prepare(
    `SELECT student_id FROM homework WHERE student_id = ?`
  ).bind(studentId).first()
  if (existing) {
    await env.DB.prepare(
      `UPDATE homework SET total = ?, missed = ?, rate = ?, updated_at = datetime('now') WHERE student_id = ?`
    ).bind(total, missed, rate, studentId).run()
  } else {
    await env.DB.prepare(
      `INSERT INTO homework (student_id, total, missed, rate) VALUES (?, ?, ?, ?)`
    ).bind(studentId, total, missed, rate).run()
  }
  return rate
}

// 由明细回写汇总。allowZero=false 时，没有任何已标记记录的学生保留原有手工汇总值，
// 避免明细功能一上线就把教师手工录入的提交率清零。
async function recomputeHomeworkForStudents(env, studentIds, { allowZero = false } = {}) {
  const ids = [...new Set((studentIds || []).filter(Boolean))]
  let updated = 0
  for (const sid of ids) {
    const { results } = await env.DB.prepare(
      `SELECT status, COUNT(*) AS c FROM homework_records WHERE student_id = ? GROUP BY status`
    ).bind(sid).all()
    const counts = { submitted: 0, late: 0, missing: 0, exempt: 0, pending: 0 }
    for (const r of (results || [])) {
      if (counts[r.status] !== undefined) counts[r.status] = Number(r.c) || 0
    }
    const total = counts.submitted + counts.late + counts.missing
    if (total === 0 && !allowZero) continue
    await upsertHomeworkSummary(env, sid, total, counts.missing)
    updated++
  }
  return updated
}

async function getOrCreateAssignment(env, className, subject, title, dueDate, createdBy) {
  const found = await env.DB.prepare(
    `SELECT id FROM homework_assignments WHERE class_name = ? AND subject = ? AND title = ? AND due_date = ?`
  ).bind(className, subject, title, dueDate).first()
  if (found) return { id: found.id, created: false }

  const res = await env.DB.prepare(
    `INSERT INTO homework_assignments (class_name, subject, title, due_date, created_by) VALUES (?, ?, ?, ?, ?)`
  ).bind(className, subject, title, dueDate, createdBy || null).run()
  return { id: res.meta?.last_row_id, created: true }
}

function homeworkCountsToStats(counts) {
  const c = { submitted: 0, late: 0, missing: 0, exempt: 0, pending: 0, ...counts }
  const submittedTotal = c.submitted + c.late
  const total = submittedTotal + c.missing
  return {
    submitted: c.submitted,
    late: c.late,
    missing: c.missing,
    exempt: c.exempt,
    pending: c.pending,
    total,
    submittedTotal,
    rate: total === 0 ? 0 : submittedTotal / total
  }
}

// 作业列表（含「谁没交」名单）
async function handleListHomeworkAssignments(request, env, user) {
  await ensureHomeworkTables(env)
  const url = new URL(request.url)
  const className = resolveHomeworkScope(user, url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit')) || 30, 1), 200)

  const sql = `
    SELECT ha.id, ha.class_name, ha.subject, ha.title, ha.due_date, ha.note, ha.created_at,
           IFNULL(SUM(CASE WHEN hr.status = 'submitted' THEN 1 ELSE 0 END), 0) AS submitted,
           IFNULL(SUM(CASE WHEN hr.status = 'late' THEN 1 ELSE 0 END), 0) AS late,
           IFNULL(SUM(CASE WHEN hr.status = 'missing' THEN 1 ELSE 0 END), 0) AS missing,
           IFNULL(SUM(CASE WHEN hr.status = 'exempt' THEN 1 ELSE 0 END), 0) AS exempt,
           IFNULL(SUM(CASE WHEN hr.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending
    FROM homework_assignments ha
    LEFT JOIN homework_records hr ON hr.assignment_id = ha.id
    ${className ? 'WHERE ha.class_name = ?' : ''}
    GROUP BY ha.id
    ORDER BY ha.due_date DESC, ha.id DESC
    LIMIT ?`
  const binds = className ? [className, limit] : [limit]
  const { results } = await env.DB.prepare(sql).bind(...binds).all()
  const rows = results || []

  // 一次查出所有「未交 / 补交」名单，避免逐条查询
  const byAssignment = {}
  const ids = rows.map(r => r.id)
  if (ids.length) {
    const { results: names } = await env.DB.prepare(
      `SELECT hr.assignment_id AS aid, u.id AS sid, u.name AS name, hr.status AS status
       FROM homework_records hr
       JOIN users u ON u.id = hr.student_id
       WHERE hr.assignment_id IN (${placeholders(ids.length)})
         AND hr.status IN ('missing', 'late')
       ORDER BY u.id`
    ).bind(...ids).all()
    for (const n of (names || [])) {
      if (!byAssignment[n.aid]) byAssignment[n.aid] = { missing: [], late: [] }
      byAssignment[n.aid][n.status].push({ id: n.sid, name: n.name })
    }
  }

  return jsonResp(rows.map(r => ({
    id: r.id,
    className: r.class_name,
    subject: r.subject,
    title: r.title,
    dueDate: r.due_date,
    note: r.note,
    createdAt: r.created_at,
    stats: homeworkCountsToStats({
      submitted: Number(r.submitted) || 0,
      late: Number(r.late) || 0,
      missing: Number(r.missing) || 0,
      exempt: Number(r.exempt) || 0,
      pending: Number(r.pending) || 0
    }),
    notSubmitted: (byAssignment[r.id] || {}).missing || [],
    lateStudents: (byAssignment[r.id] || {}).late || []
  })))
}

// 新建作业：自动为该班全体学生建立「待标记」记录
async function handleCreateHomeworkAssignment(request, env, teacher) {
  await ensureHomeworkTables(env)
  let body
  try { body = await request.json() } catch { return jsonResp({ error: '请求体无效' }, 400) }

  const className = normalizeClassName(body.className || teacher.className || '')
  const title = String(body.title || '').trim()
  const subject = String(body.subject || '').trim()
  const dueDate = normalizeDate(body.dueDate)
  const note = String(body.note || '').trim()

  if (!className) return jsonResp({ error: '请选择班级' }, 400)
  if (!title) return jsonResp({ error: '请填写作业标题' }, 400)
  if (!dueDate) return jsonResp({ error: '请填写截止日期（YYYY-MM-DD）' }, 400)

  const denied = assertHomeworkScope(teacher, className)
  if (denied) return denied

  const students = await dbGetClassStudents(env, className)
  if (!students.length) return jsonResp({ error: '该班级还没有学生，请先导入学生' }, 400)

  const { id: assignmentId } = await getOrCreateAssignment(env, className, subject, title, dueDate, teacher.id)

  for (const s of students) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO homework_records (assignment_id, student_id, status) VALUES (?, ?, 'pending')`
    ).bind(assignmentId, s.id).run()
  }

  return jsonResp({ success: true, id: assignmentId, studentCount: students.length })
}

// 单次作业详情（以 users 表为驱动，新转入的学生也会出现在名单里）
async function handleGetHomeworkAssignment(request, env, user, id) {
  await ensureHomeworkTables(env)
  const asg = await env.DB.prepare(
    `SELECT id, class_name, subject, title, due_date, note, created_at FROM homework_assignments WHERE id = ?`
  ).bind(id).first()
  if (!asg) return jsonResp({ error: '作业不存在' }, 404)
  const denied = assertHomeworkScope(user, asg.class_name)
  if (denied) return denied

  const { results } = await env.DB.prepare(
    `SELECT u.id AS student_id, u.name AS name,
            IFNULL(hr.status, 'pending') AS status,
            IFNULL(hr.note, '') AS note
     FROM users u
     LEFT JOIN homework_records hr ON hr.student_id = u.id AND hr.assignment_id = ?
     WHERE u.role = 'student' AND u.class_name = ?
     ORDER BY u.id`
  ).bind(id, asg.class_name).all()

  const records = (results || []).map(r => ({
    studentId: r.student_id,
    name: r.name,
    status: r.status,
    note: r.note
  }))
  const counts = { submitted: 0, late: 0, missing: 0, exempt: 0, pending: 0 }
  for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1

  return jsonResp({
    assignment: {
      id: asg.id,
      className: asg.class_name,
      subject: asg.subject,
      title: asg.title,
      dueDate: asg.due_date,
      note: asg.note,
      createdAt: asg.created_at
    },
    records,
    stats: homeworkCountsToStats(counts)
  })
}

// 批量保存提交状态（点名）：只允许提交本班学生，保存后回写汇总
async function handleSaveHomeworkRecords(request, env, user, id) {
  await ensureHomeworkTables(env)
  const asg = await env.DB.prepare(
    `SELECT id, class_name FROM homework_assignments WHERE id = ?`
  ).bind(id).first()
  if (!asg) return jsonResp({ error: '作业不存在' }, 404)
  const denied = assertHomeworkScope(user, asg.class_name)
  if (denied) return denied

  let body
  try { body = await request.json() } catch { return jsonResp({ error: '请求体无效' }, 400) }
  const records = Array.isArray(body.records) ? body.records : null
  if (!records || !records.length) return jsonResp({ error: '没有需要保存的记录' }, 400)

  const validStudents = new Set((await dbGetClassStudents(env, asg.class_name)).map(s => s.id))
  const affected = []
  let updated = 0

  for (const r of records) {
    const studentId = String(r.studentId ?? r.student_id ?? '').trim()
    if (!studentId) return jsonResp({ error: '记录缺少学号' }, 400)
    if (!validStudents.has(studentId)) {
      return jsonResp({ error: `学号 ${studentId} 不在本班，已终止保存` }, 400)
    }
    const status = normalizeHomeworkStatus(r.status)
    if (!status || !HOMEWORK_STATUSES.includes(status)) {
      return jsonResp({ error: `学号 ${studentId} 的状态无效：${r.status}` }, 400)
    }
    const note = String(r.note || '').trim()

    await env.DB.prepare(
      `INSERT INTO homework_records (assignment_id, student_id, status, note)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(assignment_id, student_id)
       DO UPDATE SET status = excluded.status, note = excluded.note, updated_at = datetime('now')`
    ).bind(id, studentId, status, note).run()
    affected.push(studentId)
    updated++
  }

  await recomputeHomeworkForStudents(env, affected, { allowZero: true })

  const { results } = await env.DB.prepare(
    `SELECT status, COUNT(*) AS c FROM homework_records WHERE assignment_id = ? GROUP BY status`
  ).bind(id).all()
  const counts = { submitted: 0, late: 0, missing: 0, exempt: 0, pending: 0 }
  for (const r of (results || [])) counts[r.status] = Number(r.c) || 0

  return jsonResp({ success: true, updated, stats: homeworkCountsToStats(counts) })
}

async function handleDeleteHomeworkAssignment(request, env, user, id) {
  await ensureHomeworkTables(env)
  const asg = await env.DB.prepare(
    `SELECT id, class_name FROM homework_assignments WHERE id = ?`
  ).bind(id).first()
  if (!asg) return jsonResp({ error: '作业不存在' }, 404)
  const denied = assertHomeworkScope(user, asg.class_name)
  if (denied) return denied

  const { results } = await env.DB.prepare(
    `SELECT student_id FROM homework_records WHERE assignment_id = ?`
  ).bind(id).all()
  const affected = (results || []).map(r => r.student_id)

  await env.DB.prepare(`DELETE FROM homework_records WHERE assignment_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM homework_assignments WHERE id = ?`).bind(id).run()
  // 删掉最后一次作业后，明细口径应归零，因此允许写 0
  await recomputeHomeworkForStudents(env, affected, { allowZero: true })

  return jsonResp({ success: true, affectedStudents: affected.length })
}

// CSV 批量录入作业数据
// mode='summary'：学号,应交次数,未交次数 → 直接写 homework 汇总
// mode='detail' ：作业标题,科目,日期,学号,状态 → 建作业并逐人记状态
async function handleImportHomework(request, env, teacher) {
  await ensureHomeworkTables(env)
  let body
  try { body = await request.json() } catch { return jsonResp({ error: '请求体无效' }, 400) }

  const mode = body.mode === 'detail' ? 'detail' : 'summary'
  const rows = Array.isArray(body.rows) ? body.rows : []
  if (!rows.length) return jsonResp({ error: '没有可导入的数据' }, 400)

  let imported = 0, skipped = 0
  const errors = []
  const affected = []

  // 教师只能录入自己班级（管理员按学生实际班级）
  const ownClass = normalizeClassName(teacher.className || '')
  const scopeOk = className => teacher.role === 'admin' || normalizeClassName(className || '') === ownClass

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const studentId = String(row['学号'] || row['学生学号'] || row['id'] || '').trim()

    if (!studentId) {
      errors.push({ row: i + 1, reason: '缺少学号' })
      continue
    }
    const student = await env.DB.prepare(
      `SELECT id, name, class_name FROM users WHERE id = ? AND role = 'student'`
    ).bind(studentId).first()
    if (!student) {
      errors.push({ row: i + 1, studentId, reason: '学生不存在' })
      skipped++
      continue
    }
    if (!scopeOk(student.class_name)) {
      errors.push({ row: i + 1, studentId, reason: '学生不在你负责的班级' })
      skipped++
      continue
    }

    try {
      if (mode === 'summary') {
        const rawTotal = row['应交次数'] ?? row['应交'] ?? row['total'] ?? row['应提交次数']
        const rawMissed = row['未交次数'] ?? row['未交'] ?? row['missed'] ?? row['缺交次数']
        const total = Number(rawTotal)
        const missed = Number(rawMissed)
        if (!Number.isInteger(total) || total < 0) {
          errors.push({ row: i + 1, studentId, reason: '应交次数必须是不小于 0 的整数' })
          continue
        }
        if (!Number.isInteger(missed) || missed < 0 || missed > total) {
          errors.push({ row: i + 1, studentId, reason: '未交次数必须是不小于 0 且不超过应交次数的整数' })
          continue
        }
        await upsertHomeworkSummary(env, studentId, total, missed)
        imported++
      } else {
        const title = String(row['作业标题'] || row['标题'] || row['title'] || '').trim()
        const subject = String(row['科目'] || row['subject'] || '').trim()
        const dueDate = normalizeDate(row['日期'] || row['截止日期'] || row['due_date'] || row['dueDate']) || new Date().toISOString().slice(0, 10)
        const rawStatus = row['状态'] ?? row['提交状态'] ?? row['status'] ?? ''
        const status = normalizeHomeworkStatus(rawStatus)
        if (!title) {
          errors.push({ row: i + 1, studentId, reason: '缺少作业标题' })
          continue
        }
        if (!status) {
          errors.push({ row: i + 1, studentId, reason: `无法识别的状态：${rawStatus}` })
          continue
        }
        const { id: assignmentId } = await getOrCreateAssignment(env, student.class_name, subject, title, dueDate, teacher.id)
        await env.DB.prepare(
          `INSERT INTO homework_records (assignment_id, student_id, status, note)
           VALUES (?, ?, ?, '')
           ON CONFLICT(assignment_id, student_id)
           DO UPDATE SET status = excluded.status, updated_at = datetime('now')`
        ).bind(assignmentId, studentId, status).run()
        affected.push(studentId)
        imported++
      }
    } catch (e) {
      errors.push({ row: i + 1, studentId, reason: '写入失败: ' + e.message })
    }
  }

  let summaryUpdated = 0
  if (mode === 'detail' && affected.length) {
    summaryUpdated = await recomputeHomeworkForStudents(env, affected)
  }

  return jsonResp({ success: true, mode, imported, skipped, summaryUpdated, errors, total: rows.length })
}

// ===== 主入口 =====
export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  // 去掉 /api 前缀，取剩余路径
  let path = url.pathname
  if (path.startsWith('/api/')) {
    path = path.slice(4) // 去掉 '/api'
  } else if (path.startsWith('/api')) {
    path = path.slice(4)
  }

  const method = request.method

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  // 公开路由
  if (path === '/auth/login' && method === 'POST') return handleLogin(request, env)
  if (path === '/auth/register' && method === 'POST') return handleRegister(request, env)
  if (path === '/health' || path === '/') {
    return jsonResp({ status: 'ok', source: 'pages-functions', time: new Date().toISOString() })
  }
  // 科目库（公开元数据）
  if (path === '/subjects' && method === 'GET') {
    return handleListSubjects()
  }
  // KV 诊断
  if (path === '/debug/kv' && method === 'GET') {
    const kvTest = await env.SESSIONS?.put('__kv_test__', 'ok', { expirationTtl: 60 })
    const kvGet = await env.SESSIONS?.get('__kv_test__')
    return jsonResp({ env: typeof env, dbType: typeof env?.DB, sessionsType: typeof env?.SESSIONS, kvPut: kvTest, kvGet })
  }

  // 需要登录
  const { user, response } = await requireAuth(request, env)
  if (response) return response

  if (path === '/auth/logout' && method === 'POST') return handleLogout(request, env)
  if (path === '/auth/me' && method === 'GET') return handleMe(request, env)
  if (path === '/auth/change-password' && method === 'POST') return handleChangePassword(request, env, user)

  // 班级列表
  if (path === '/classrooms' && method === 'GET') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleListClassrooms(request, env, t)
  }

  // 学生列表
  if (path === '/students' && method === 'GET') {
    // 信息隔离：学生端只能取到自己这一条。
    // 班级名单、同学的作业提交率属于教师/管理员的管理数据，学生不应可见
    // （原先学生登录后会拿到整个班级名单，等于把全班信息公开给学生）。
    if (user.role === 'student') {
      const me = await dbGetStudents(env, null, user.id)
      return jsonResp(me)
    }
    // 教师/管理员：query 参数优先，其次 session 班级；空/全部班级 → 查全部
    const rawClass = url.searchParams.get('class') || user.className
    const className = (!rawClass || rawClass === '全部班级') ? null : rawClass
    const students = await dbGetStudents(env, className)
    return jsonResp(students)
  }

  // 单条添加学生
  if (path === '/students' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleCreateStudent(request, env, t)
  }

  // 编辑学生
  if (path.match(/^\/students\/[^/]+$/) && method === 'PUT') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleUpdateStudent(request, env, t, path.split('/')[2])
  }
  // 删除学生
  if (path.match(/^\/students\/[^/]+$/) && method === 'DELETE') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleDeleteStudent(request, env, t, path.split('/')[2])
  }

  // 批量导入学生
  if (path === '/students/import' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleImportStudents(request, env, t)
  }

  // 批量导入成绩
  if (path === '/students/import-scores' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleImportScores(request, env, t)
  }

  // 批量录入作业数据（CSV：汇总式 / 明细式）
  if (path === '/students/import-homework' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleImportHomework(request, env, t)
  }

  // 单个学生档案
  if (path.startsWith('/student/') && method === 'GET') {
    const parts = path.split('/').filter(Boolean)
    const studentId = parts[1]
    if (user.role === 'student' && user.id !== studentId) {
      return jsonResp({ error: '无权查看' }, 403)
    }
    if (parts[2] === 'scores') {
      const { results } = await env.DB.prepare(
        `SELECT exam_name, subject, score FROM scores WHERE student_id = ? ORDER BY id`
      ).bind(studentId).all()
      return jsonResp(results)
    }
    if (parts[2] === 'events') {
      const { results } = await env.DB.prepare(
        `SELECT event_date as date, event_type as type, content FROM events WHERE student_id = ? ORDER BY event_date`
      ).bind(studentId).all()
      return jsonResp(results)
    }
    const student = await dbGetStudent(env, studentId)
    if (!student) return jsonResp({ error: '未找到该学生' }, 404)
    return jsonResp(student)
  }

  if (path.match(/^\/student\/[^/]+\/score$/) && method === 'POST') {
    const { user: teacher, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleAddScore(request, env, path.split('/')[2])
  }

  if (path.match(/^\/student\/[^/]+\/event$/) && method === 'POST') {
    const { user: teacher, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleAddEvent(request, env, path.split('/')[2])
  }
  if (path.match(/^\/student\/[^/]+\/event$/) && method === 'DELETE') {
    const { user: teacher, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleDeleteEvent(request, env, path.split('/')[2])
  }

  // 课堂行为评分编辑（教师/管理员）
  if (path.match(/^\/student\/[^/]+\/behavior$/) && method === 'PUT') {
    const { user: teacher, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleUpdateBehavior(request, env, teacher, path.split('/')[2])
  }

  // 作业提交情况编辑（教师/管理员）
  if (path.match(/^\/student\/[^/]+\/homework$/) && method === 'PUT') {
    const { user: teacher, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleUpdateHomework(request, env, teacher, path.split('/')[2])
  }

  // ===== 作业明细：每次作业 × 每人提交状态 =====
  // 作业列表（含「谁没交」名单）
  if (path === '/homework/assignments' && method === 'GET') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleListHomeworkAssignments(request, env, t)
  }
  // 新建作业（自动为该班学生建立待标记记录）
  if (path === '/homework/assignments' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleCreateHomeworkAssignment(request, env, t)
  }
  // 单次作业详情（名单 + 状态）
  if (path.match(/^\/homework\/assignments\/[^/]+$/) && method === 'GET') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleGetHomeworkAssignment(request, env, t, path.split('/')[3])
  }
  // 保存点名结果
  if (path.match(/^\/homework\/assignments\/[^/]+\/records$/) && method === 'PUT') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleSaveHomeworkRecords(request, env, t, path.split('/')[3])
  }
  // 删除作业（连带明细，并重算汇总）
  if (path.match(/^\/homework\/assignments\/[^/]+$/) && method === 'DELETE') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleDeleteHomeworkAssignment(request, env, t, path.split('/')[3])
  }

  // 邀请码管理
  if (path === '/admin/invite-codes' && method === 'GET') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleListInviteCodes(request, env)
  }
  if (path === '/admin/invite-codes' && method === 'POST') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleCreateInviteCodes(request, env, a)
  }
  if (path.match(/^\/admin\/invite-codes\/[^/]+$/) && method === 'DELETE') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleRevokeInviteCode(request, env, path.split('/')[3])
  }

  // 家长账号管理
  if (path === '/admin/parents' && method === 'GET') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleListParents(request, env)
  }
  if (path === '/admin/parents' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleCreateParent(request, env, t)
  }
  // 编辑家长
  if (path.match(/^\/admin\/parents\/[^/]+$/) && method === 'PUT') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleUpdateParent(request, env, t, path.split('/')[3])
  }
  // 删除家长
  if (path.match(/^\/admin\/parents\/[^/]+$/) && method === 'DELETE') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleDeleteParent(request, env, t, path.split('/')[3])
  }
  if (path === '/admin/parent-links' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleLinkParent(request, env, t)
  }

  // 教师管理
  if (path === '/admin/teachers' && method === 'GET') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleListTeachers(request, env)
  }
  if (path === '/admin/teachers' && method === 'POST') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleCreateTeacher(request, env, a)
  }
  // 编辑教师
  if (path.match(/^\/admin\/teachers\/[^/]+$/) && method === 'PUT') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleUpdateTeacher(request, env, a, path.split('/')[3])
  }
  // 删除教师
  if (path.match(/^\/admin\/teachers\/[^/]+$/) && method === 'DELETE') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleDeleteTeacher(request, env, a, path.split('/')[3])
  }

  // 修正全角 className
  if (path === '/admin/fix-classnames' && method === 'POST') {
    const { user: a, response: r } = await requireAdmin(request, env)
    if (r) return r
    return handleFixClassNames(request, env)
  }

  // AI 报告
  if (path === '/ai/report' && method === 'POST') {
    return handleAIReport(request, env, user)
  }

  // 家长端
  if (path === '/parent/children' && method === 'GET') {
    const { user: p, response: r } = await requireParent(request, env)
    if (r) return r
    return handleParentChildren(request, env, p)
  }
  if (path.match(/^\/parent\/student\/[^/]+$/) && method === 'GET') {
    const { user: p, response: r } = await requireParent(request, env)
    if (r) return r
    return handleParentStudent(request, env, p, path.split('/')[3])
  }

  return jsonResp({ error: 'Not Found', path }, 404)
}
