// 数据访问层：所有页面都通过这里取数。
// 当前接 CF Pages Functions（同源 /api/*）；后端逻辑已从 Worker 移植到 Pages Functions。

import { students } from '../data/mock.js'
import { getToken } from './auth.js'

// ===== 接 CF Pages Functions =====
const USE_WORKER = true  // ← 切换开关
// Pages Functions 同源部署，前端请求 /api/* 由后端 catch-all 路由处理
const API = '/api'

async function fetchJSON(url, options = {}) {
  const token = getToken()
  if (token) {
    options.headers = { ...(options.headers || {}), 'Authorization': `Bearer ${token}` }
  }
  const r = await fetch(url, options)
  if (!r.ok) {
    let msg = '请求失败: ' + r.status
    try { const d = await r.json(); if (d.error) msg = d.error } catch {}
    throw new Error(msg)
  }
  return r.json()
}

// 返回全班概览列表
export async function getStudents() {
  if (USE_WORKER) return fetchJSON(`${API}/students`)
  return students.map(s => ({
    id: s.id, name: s.name, className: s.className,
    lastExam: s.scores[s.scores.length - 1], homeworkRate: s.homework.rate
  }))
}

// 返回单个学生完整档案
export async function getStudent(id) {
  if (USE_WORKER) return fetchJSON(`${API}/student/${id}`)
  return students.find(s => s.id === id) || null
}

// AI 生成成长画像
export async function generateAIReport(studentId) {
  if (USE_WORKER) {
    return fetchJSON(`${API}/ai/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    })
  }
  await new Promise(r => setTimeout(r, 800))
  const s = students.find(x => x.id === studentId)
  return s?.aiReport || null
}

// ===== 管理后台接口 =====

// 班级列表（教师看自己的班，管理员看全部）
export async function getClassrooms() {
  if (USE_WORKER) return fetchJSON(`${API}/classrooms`)
  return ['高三(2)班']
}

// 教师列表（仅管理员）
export async function getTeachers() {
  if (USE_WORKER) return fetchJSON(`${API}/admin/teachers`)
  return []
}

// 创建教师（仅管理员）
export async function createTeacher(payload) {
  if (USE_WORKER) {
    return fetchJSON(`${API}/admin/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }
  return { success: true, user: payload }
}

// 单条添加学生
export async function createStudent(payload) {
  if (USE_WORKER) {
    return fetchJSON(`${API}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }
  return { success: true, user: payload }
}

// CSV 批量导入学生（前端解析后传数组）
export async function importStudents(rows) {
  if (USE_WORKER) {
    return fetchJSON(`${API}/students/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: rows })
    })
  }
  return { success: true, created: rows.length, skipped: 0, errors: [] }
}

// 家长查看自己关联的孩子列表
export async function getParentChildren() {
  if (USE_WORKER) return fetchJSON(`${API}/parent/children`)
  return []
}

// 家长查看单个孩子档案（后端已剔除心理画像）
export async function getParentStudent(id) {
  if (USE_WORKER) return fetchJSON(`${API}/parent/student/${id}`)
  return null
}
