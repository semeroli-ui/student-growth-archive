// 数据访问层：所有页面都通过这里取数。
// 当前用 mock；接真实数据时只需改本文件，前端无需改动。

import { students } from '../data/mock.js'

// ===== 接真实后端：把 USE_WORKER 改为 true，并填 WORKER_URL =====
const USE_WORKER = false
const WORKER_URL = '' // 例如 'https://archive-api.your-subdomain.workers.dev'

async function fetchJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('请求失败: ' + r.status)
  return r.json()
}

// 返回全班概览列表（id/name/className/最近趋势摘要）
export async function getStudents() {
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/students`)
  return students.map(s => ({
    id: s.id,
    name: s.name,
    className: s.className,
    lastExam: s.scores[s.scores.length - 1],
    homeworkRate: s.homework.rate
  }))
}

// 返回单个学生完整档案
export async function getStudent(id) {
  if (USE_WORKER) return fetchJSON(`${WORKER_URL}/student/${id}`)
  return students.find(s => s.id === id) || null
}
