/**
 * CSV 工具：统一处理「读取文件 + 编码探测 + 双引号转义解析 + 下载」。
 *
 * 为什么需要：Excel 导出的中文 CSV 通常是 GBK 编码，直接按 UTF-8 读会乱码；
 * 而单元格里一旦含逗号就会被引号包裹，简单 split(',') 会切错列。
 */

/** 读取文件文本并自动探测编码（UTF-8 / GBK），避免 Excel 导出中文乱码 */
export async function readTextFile(file) {
  const buffer = await file.arrayBuffer()
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    if (/[\u4e00-\u9fa5]/.test(utf8)) return utf8
  } catch (e) { /* 非法 UTF-8 序列 → 继续尝试 GBK */ }
  try {
    const gbk = new TextDecoder('gbk', { fatal: true }).decode(buffer)
    if (/[\u4e00-\u9fa5]/.test(gbk)) return gbk
  } catch (e) { /* ignore */ }
  return new TextDecoder('utf-8').decode(buffer)
}

/** 解析一行 CSV，支持双引号包裹与 "" 转义 */
export function splitCSVLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { quoted = false }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

/**
 * 解析 CSV 文本 → { header, rows, matrix }
 * rows 为对象数组（键=表头），matrix 为二维数组（含表头行）
 */
export function parseCSV(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { header: [], rows: [], matrix: [] }
  const matrix = lines.map(splitCSVLine)
  const header = matrix[0]
  const rows = []
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i]
    if (!cells.some(c => c)) continue
    const obj = {}
    header.forEach((h, idx) => { obj[h] = cells[idx] ?? '' })
    rows.push(obj)
  }
  return { header, rows, matrix }
}

/** 表头里是否包含任意一个关键词（用于自动识别 CSV 类型） */
export function headerHas(header, keywords) {
  return (header || []).some(h => keywords.some(k => String(h).includes(k)))
}

/**
 * 下载 CSV。带 UTF-8 BOM，保证 Excel 双击打开不乱码
 * （Windows 版 Excel 会按本地编码解析无 BOM 的 UTF-8 文件）。
 */
export function downloadCSV(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
