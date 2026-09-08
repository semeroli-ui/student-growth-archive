// 数据访问层：所有页面都通过这里取数。
// 当前接 CF Workers；后端已提供学生/教师/班级的创建与管理接口。

import { students } from '../data/mock.js'
import { getToken } from './auth.js'

// ===== 接 CF Workers =====
const USE_WORKER = true  // ← 切换开关
const WORKER_URL = 'https://student-growth-archive-api.wkyong2008.workers.dev'

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
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/students`)
  return students.map(s => ({
    id: s.id, name: s.name, className: s.className,
    lastExam: s.scores[s.scores.length - 1], homeworkRate: s.homework.rate
  }))
}

// 返回单个学生完整档案
export async function getStudent(id) {
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/student/${id}`)
  return students.find(s => s.id === id) || null
}

// AI 生成成长画像
export async function generateAIReport(studentId) {
  if (USE_WORKER) {
    return fetchJSON(`${WORKER_URL}/ai/report`, {
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
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/classrooms`)
  return ['高三(2)班']
}

// 教师列表（仅管理员）
export async function getTeachers() {
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/admin/teachers`)
  return []
}

// 创建教师（仅管理员）
export async function createTeacher(payload) {
  if (USE_WORKER) {
    return fetchJSON(`${WORKER_URL}/admin/teachers`, {
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
    return fetchJSON(`${WORKER_URL}/students`, {
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
    return fetchJSON(`${WORKER_URL}/students/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: rows })
    })
  }
  return { success: true, created: rows.length, skipped: 0, errors: [] }
}

// 家长查看自己关联的孩子列表
export async function getParentChildren() {
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/parent/children`)
  return []
}

// 家长查看单个孩子档案（后端已剔除心理画像）
export async function getParentStudent(id) {
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/parent/student/${id}`)
  return null
}
