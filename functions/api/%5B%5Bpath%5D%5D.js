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

// ===== D1 查询函数 =====

async function dbGetStudents(env, className) {
  let query = `SELECT u.id, u.name, u.class_name, u.role FROM users u WHERE u.role = 'student'`
  let params = []
  if (className && className !== '全部班级') {
    query += ` AND u.class_name = ?`
    params.push(className)
  }
  query += ` ORDER BY u.id`
  const { results } = await env.DB.prepare(query).bind(...params).all()

  const students = []
  for (const s of results) {
    const lastExam = await env.DB.prepare(
      `SELECT exam_name, subject, score FROM scores WHERE student_id = ? ORDER BY id DESC LIMIT 3`
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
    `SELECT exam_name, subject, score FROM scores WHERE student_id = ? ORDER BY id`
  ).bind(id).all()

  const examMap = {}
  for (const r of scoreRows) {
    if (!examMap[r.exam_name]) examMap[r.exam_name] = { exam: r.exam_name }
    examMap[r.exam_name][r.subject] = r.score
  }
  const scores = Object.values(examMap)

  const homework = await env.DB.prepare(
    `SELECT total, missed, rate FROM homework WHERE student_id = ?`
  ).bind(id).first() || { rate: 0, missed: 0, total: 0 }

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
    behavior,
    events,
    aiReport
  }
}

// ===== Handler 函数 =====

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
    const rawClass = String(row.className || '').trim()
    // 导入时额外清理全角括号
    const className = fwRe.test(rawClass) ? normalizeClassName(rawClass) : rawClass
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
    const resp = await fetch(`${env.AGNES_BASE_URL}/chat/completions`, {
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
  const { exam_name, subject, score } = await request.json()
  if (!exam_name || !subject || score === undefined) return jsonResp({ error: '缺少参数' }, 400)
  await env.DB.prepare(
    `INSERT OR REPLACE INTO scores (student_id, exam_name, subject, score) VALUES (?, ?, ?, ?)`
  ).bind(studentId, exam_name, subject, score).run()
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
    const className = user.role === 'student'
      ? user.className
      : (url.searchParams.get('class') || user.className)
    const students = await dbGetStudents(env, className)
    return jsonResp(students)
  }

  // 单条添加学生
  if (path === '/students' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleCreateStudent(request, env, t)
  }

  // 批量导入
  if (path === '/students/import' && method === 'POST') {
    const { user: t, response: r } = await requireTeacher(request, env)
    if (r) return r
    return handleImportStudents(request, env, t)
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
