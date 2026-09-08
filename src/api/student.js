// 数据访问层：所有页面都通过这里取数。
// 当前用 mock；接真实数据时只需改 USE_WORKER 为 true 并填 WORKER_URL。

import { students } from '../data/mock.js'
import { getToken } from './auth.js'

// ===== 接 CF Workers =====
const USE_WORKER = true  // ← 切换开关
const WORKER_URL = 'https://student-growth-archive-api.wkyong2008.workers.dev'

async function fetchJSON(url, options = {}) {
  const token = getToken()
  if (token) {
    options.headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    }
  }
  const r = await fetch(url, options)
  if (!r.ok) throw new Error('请求失败: ' + r.status)
  return r.json()
}

// 返回全班概览列表
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

// AI 生成成长画像（调 CF Workers → Agnes 3.0 Flash）
export async function generateAIReport(studentId) {
  if (USE_WORKER) {
    return fetchJSON(`${WORKER_URL}/ai/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    })
  }
  // mock 模式：模拟延迟后返回预置报告
  await new Promise(r => setTimeout(r, 800))
  const s = students.find(x => x.id === studentId)
  return s?.aiReport || null
}
