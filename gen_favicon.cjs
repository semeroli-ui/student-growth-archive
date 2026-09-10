// 学生成长档案 favicon 生成器（纯 Node，无依赖）
// 产出: favicon.ico(16/32/48), favicon-16x16.png, favicon-32x32.png,
//       apple-touch-icon.png(180), icon-192.png, icon-512.png, favicon.svg
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const outDir = path.join(__dirname, 'public')
fs.mkdirSync(outDir, { recursive: true })

/* ---------- 工具: CRC32 / PNG 编码 ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function pngEncode(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

/* ---------- 配色（项目品牌） ---------- */
function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
const cA = hexRgb('#1a5c52')   // 左上 深青绿
const cB = hexRgb('#3a7bd5')   // 右下 蓝
const WHITE = [255, 255, 255]

/* ---------- 图形（单位坐标 0..1，y 向下） ----------
   主题：成长档案 = 上升柱状 + 上行趋势线（参考 favicon.txt 样式，品牌渐变底） */
const BARS = [{ x: 0.25, top: 0.54 }, { x: 0.50, top: 0.42 }, { x: 0.75, top: 0.30 }]
const YB = 0.80            // 柱底基线
const HALF_W = 0.07        // 柱半宽
const HALF_LW = 0.05       // 趋势线半宽
const TREND = { ax: 0.18, ay: 0.72, bx: 0.82, by: 0.34 }

function distSeg(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy
  let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  const ex = x - (ax + t * dx), ey = y - (ay + t * dy)
  return Math.sqrt(ex * ex + ey * ey)
}
function isWhite(x, y) {
  for (const b of BARS) {
    if (x >= b.x - HALF_W && x <= b.x + HALF_W && y >= b.top && y <= YB) return true
    if (distSeg(x, y, b.x, b.top, b.x, b.top) <= HALF_W) return true   // 柱顶圆头
  }
  if (distSeg(x, y, TREND.ax, TREND.ay, TREND.bx, TREND.by) <= HALF_LW) return true
  return false
}

function render(S, k) {
  const buf = Buffer.alloc(S * S * 4)
  const N = k * k
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      let wc = 0
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          if (isWhite((px + (i + 0.5) / k) / S, (py + (j + 0.5) / k) / S)) wc++
        }
      }
      const f = wc / N
      const t = Math.min(1, Math.max(0, ((px + 0.5) / S + (py + 0.5) / S) / 2))
      const o = (py * S + px) * 4
      buf[o] = Math.round(cA[0] + (cB[0] - cA[0]) * t + (WHITE[0] - (cA[0] + (cB[0] - cA[0]) * t)) * f)
      buf[o + 1] = Math.round(cA[1] + (cB[1] - cA[1]) * t + (WHITE[1] - (cA[1] + (cB[1] - cA[1]) * t)) * f)
      buf[o + 2] = Math.round(cA[2] + (cB[2] - cA[2]) * t + (WHITE[2] - (cA[2] + (cB[2] - cA[2]) * t)) * f)
      buf[o + 3] = 255
    }
  }
  return buf
}
function writePng(S, k, file) {
  const png = pngEncode(S, S, render(S, k))
  fs.writeFileSync(path.join(outDir, file), png)
  console.log(file, S + 'x' + S, png.length + 'B')
}

/* ---------- ICO（内嵌 PNG，Vista+ 全支持） ---------- */
function writeIco() {
  const sizes = [16, 32, 48]
  const pngs = sizes.map(s => pngEncode(s, s, render(s, s <= 48 ? 12 : 8)))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4)
  const entries = Buffer.alloc(16 * sizes.length)
  let offset = 6 + 16 * sizes.length
  for (let i = 0; i < sizes.length; i++) {
    const e = i * 16
    entries[e] = sizes[i]; entries[e + 1] = sizes[i]
    entries[e + 2] = 0; entries[e + 3] = 0
    entries.writeUInt16LE(1, e + 4); entries.writeUInt16LE(32, e + 6)
    entries.writeUInt32LE(pngs[i].length, e + 8); entries.writeUInt32LE(offset, e + 12)
    offset += pngs[i].length
  }
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), Buffer.concat([header, entries, ...pngs]))
  console.log('favicon.ico', sizes.join('/') + 'x', 'OK')
}

/* ---------- SVG（矢量源，现代浏览器直接使用） ---------- */
function writeSvg() {
  const S = 64
  const r = (v) => Math.round(v * 100) / 100
  const barsSvg = BARS.map(b => {
    const x = (b.x - HALF_W) * S, y = b.top * S, w = HALF_W * 2 * S, h = (YB - b.top) * S
    return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${r(HALF_W * S)}" fill="#fff"/>`
  }).join('\n  ')
  const line = `<line x1="${r(TREND.ax * S)}" y1="${r(TREND.ay * S)}" x2="${r(TREND.bx * S)}" y2="${r(TREND.by * S)}" stroke="#fff" stroke-width="${r(HALF_LW * 2 * S)}" stroke-linecap="round"/>`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${S} ${S}'>\n  <defs>\n    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n      <stop offset="0" stop-color="#1a5c52"/>\n      <stop offset="1" stop-color="#3a7bd5"/>\n    </linearGradient>\n  </defs>\n  <rect width="${S}" height="${S}" fill="url(#g)"/>\n  ${barsSvg}\n  ${line}\n</svg>\n`
  fs.writeFileSync(path.join(outDir, 'favicon.svg'), svg)
  console.log('favicon.svg OK')
}

writePng(16, 10, 'favicon-16x16.png')
writePng(32, 10, 'favicon-32x32.png')
writePng(180, 6, 'apple-touch-icon.png')
writePng(192, 6, 'icon-192.png')
writePng(512, 4, 'icon-512.png')
writeIco()
writeSvg()
console.log('DONE ->', outDir)
