<template>
  <div v-if="loading">加载中…</div>
  <div v-else-if="!student" class="card">未找到该学生档案。</div>
  <div v-else>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px" class="no-print">
      <a class="back" href="#/app" @click.prevent="$router.push('/app')">← 返回班级概览</a>
      <span class="spacer" style="flex:1"></span>
      <button class="btn outline" @click="exportPDF">
        📄 导出PDF
      </button>
    </div>

    <!-- 学生头部 -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="avatar" style="width:56px;height:56px;font-size:22px">{{ student.name.charAt(0) }}</div>
        <div>
          <h2 style="margin:0">{{ student.name }}</h2>
          <div class="sub" style="color:var(--muted)">{{ student.className }} · 学号 {{ student.id }}</div>
        </div>
        <span class="spacer" style="flex:1"></span>
        <span class="badge" :class="{ warn: student.homework.rate < 0.9 }">
          作业提交 {{ Math.round(student.homework.rate * 100) }}%
        </span>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="grid cols-2">
      <div class="card">
        <h2>成绩趋势 <span style="font-size:12px;color:var(--muted);font-weight:normal">（点击考试查看附件）</span></h2>
        <ScoreTrendChart :scores="student.scores" @exam-click="openExamDetail" />
      </div>
      <div class="card">
        <h2>课堂行为雷达</h2>
        <BehaviorRadar :behavior="student.behavior" />
      </div>
    </div>

    <!-- 添加成绩（教师/管理员） -->
    <div v-if="isStaff" class="card no-print">
      <h2>添加成绩</h2>
      <div class="score-form">
        <select v-model="scoreForm.subject" class="select">
          <option value="">选择科目</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>
        <input v-model="scoreForm.exam_name" class="input" placeholder="考试名称，如 期中" />
        <input v-model="scoreForm.score" class="input" type="number" placeholder="分数" />
        <button class="btn primary" :disabled="scoreLoading" @click="doAddScore">{{ scoreLoading ? '提交中…' : '添加' }}</button>
      </div>
      <!-- 图片附件 -->
      <div class="img-attach">
        <label class="img-label">
          <input type="file" accept="image/*" capture="environment" multiple style="display:none" @change="onImgChange" />
          <span class="btn outline btn-sm">📷 附加图片（最多3张）</span>
        </label>
        <div v-if="scoreForm.images.length" class="img-preview-list">
          <div v-for="(img, i) in scoreForm.images" :key="i" class="img-thumb">
            <img :src="img.src" alt="附件" />
            <button class="img-remove" @click="removeImg(i)">✕</button>
          </div>
          <span style="font-size:12px;color:var(--muted)">{{ scoreForm.images.length }}/3</span>
        </div>
      </div>
      <p v-if="scoreMsg" :class="['msg', scoreMsgType]">{{ scoreMsg }}</p>
    </div>

    <!-- 成绩详情弹窗（点击图表触发） -->
    <div v-if="showExamModal" class="modal-overlay" @click.self="showExamModal=false">
      <div class="modal exam-modal">
        <div class="modal-head">
          <h3>{{ examDetail.exam }}</h3>
          <button class="modal-close" @click="showExamModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="Object.keys(examDetail.scores).length" class="score-row-list">
            <div v-for="(v, subj) in examDetail.scores" :key="subj" class="score-row">
              <span>{{ subj }}</span><span>{{ v }}</span>
            </div>
          </div>
          <div v-if="examDetail.images && examDetail.imagesCount > 0" class="exam-images">
            <p style="font-size:13px;color:var(--muted);margin-bottom:8px">📎 附件图片：</p>
            <div class="exam-img-grid">
              <img v-for="(img, i) in examDetail.images" :key="i" :src="img" class="exam-img" @click="previewImg(img)" />
            </div>
          </div>
          <p v-else style="color:var(--muted);font-size:13px;text-align:center;padding:16px">暂无附件图片</p>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <div v-if="previewSrc" class="modal-overlay" @click="previewSrc=null">
      <img :src="previewSrc" class="preview-img" />
    </div>

    <!-- AI 报告 -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <h2 style="margin:0">AI 成长画像与建议</h2>
        <span v-if="aiSource" class="badge" :class="{ warn: aiSource === 'fallback' }">
          {{ aiSource === 'ai' ? '✨ AI 实时生成' : '⚡ 预置报告' }}
        </span>
        <span class="spacer" style="flex:1"></span>
        <button
          class="btn primary"
          :disabled="aiLoading"
          @click="regenerateAI"
        >{{ aiLoading ? '生成中…' : '🔄 重新生成' }}</button>
      </div>

      <div v-if="aiLoading" class="ai-loading">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <p>AI 正在分析学生数据并生成个性化报告…</p>
      </div>

      <div v-else>
        <p v-if="aiReport && aiReport.profile">{{ aiReport.profile }}</p>
        <p v-else style="color:var(--muted)">尚未生成 AI 报告，可点击右上角「重新生成」。</p>
        <div v-if="aiReport.weaknesses && aiReport.weaknesses.length" style="margin-top:12px">
          <strong class="weakness">薄弱点：</strong>
          <ul>
            <li v-for="(w, i) in aiReport.weaknesses" :key="i" class="weakness">
              {{ w.subject }} — {{ w.reason }}
            </li>
          </ul>
        </div>
        <div v-if="aiReport.suggestions && aiReport.suggestions.length" style="margin-top:12px">
          <strong>个性化建议：</strong>
          <div v-for="(s, i) in aiReport.suggestions" :key="i" class="suggestion">{{ s }}</div>
        </div>
        <div v-if="aiReport.talkScript" class="suggestion" style="border-color:var(--accent);background:var(--accent-light)">
          <strong>家校沟通话术：</strong>{{ aiReport.talkScript }}
        </div>
        <p v-if="aiError" style="color:var(--warn);font-size:12px;margin-top:8px">
          ⚠ {{ aiError }}
        </p>
        <p style="color:var(--muted);font-size:12px;margin-top:10px">* 以上内容由 AI 生成，仅供参考，以教师判断为准。</p>
      </div>
    </div>

    <!-- 时间线 -->
    <div class="card">
      <h2>成长时间线</h2>
      <div class="timeline">
        <div v-for="(e, i) in student.events" :key="i" class="timeline-item">
          <div class="date">{{ e.date }} · <span class="badge" :class="{ warn: e.type==='提醒' }">{{ e.type }}</span></div>
          <div>{{ e.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getStudent, generateAIReport, getSubjects, addScore } from '../api/student.js'
import { getRole } from '../api/auth.js'
import ScoreTrendChart from '../components/ScoreTrendChart.vue'
import BehaviorRadar from '../components/BehaviorRadar.vue'

const route = useRoute()
const student = ref(null)
const loading = ref(true)
const aiReport = ref({})
const aiLoading = ref(false)
const aiSource = ref('')
const aiError = ref('')
const subjects = ref([])
const isStaff = getRole() === 'teacher' || getRole() === 'admin'
const scoreForm = ref({ subject: '', exam_name: '', score: '', images: [] })
const scoreLoading = ref(false)
const scoreMsg = ref('')
const scoreMsgType = ref('ok')
const showExamModal = ref(false)
const examDetail = ref({ exam: '', scores: {}, images: {}, imagesCount: 0 })
const previewSrc = ref('')

// ========== 成绩附件 ==========
const MAX_IMGS = 3
const MAX_SIZE = 1 * 1024 * 1024 // 1MB 压缩后上限
const MAX_WIDTH = 1600 // 缩放上限

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取失败'))
    reader.onload = ev => {
      const img = new Image()
      img.onerror = () => reject(new Error('解码失败'))
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width))
          width = MAX_WIDTH
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
          resolve(dataUrl)
        } catch (e) { reject(e) }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function onImgChange(e) {
  const files = Array.from(e.target.files || [])
  scoreMsg.value = ''
  for (const file of files) {
    if (scoreForm.value.images.length >= MAX_IMGS) break
    if (!file.type.startsWith('image/')) continue
    try {
      const src = await compressImage(file)
      if (src.length > MAX_SIZE) {
        scoreMsg.value = `"${file.name}" 仍超过 1MB，请选更小的图`
        scoreMsgType.value = 'err'
        continue
      }
      const kb = Math.round(src.length / 1024)
      scoreForm.value.images.push({ src, name: `${file.name} (${kb}KB)` })
      scoreMsg.value = `已压缩 ${file.name} → ${kb}KB`
      scoreMsgType.value = 'ok'
    } catch (err) {
      scoreMsg.value = `"${file.name}" 压缩失败：${err.message}`
      scoreMsgType.value = 'err'
    }
  }
  e.target.value = ''
}

function removeImg(i) {
  scoreForm.value.images.splice(i, 1)
}

function previewImg(src) {
  previewSrc.value = src
}

// ========== 成绩详情弹窗 ==========
function openExamDetail({ exam }) {
  const found = student.value.scores.find(s => s.exam === exam)
  if (!found) return
  const scores = {}
  const imgs = {}
  for (const [k, v] of Object.entries(found)) {
    if (k === 'exam' || k === '_images') continue
    if (Array.isArray(v)) continue
    scores[k] = v
  }
  if (found._images) {
    for (const [subj, arr] of Object.entries(found._images)) {
      if (Array.isArray(arr) && arr.length) imgs[subj] = arr
    }
  }
  examDetail.value = {
    exam,
    scores,
    images: Object.values(imgs).flat(),
    imagesCount: Object.values(imgs).flat().length
  }
  showExamModal.value = true
}

// ========== 原有逻辑 ==========
onMounted(async () => {
  student.value = await getStudent(route.params.id)
  loading.value = false
  try { subjects.value = await getSubjects() } catch (e) {}
  if (student.value?.aiReport) {
    aiReport.value = student.value.aiReport
    aiSource.value = 'preset'
  }
})

async function regenerateAI() {
  if (!student.value) return
  aiLoading.value = true
  aiError.value = ''
  try {
    const result = await generateAIReport(student.value.id)
    if (result?.error) {
      aiError.value = result.error
    } else {
      aiReport.value = result || {}
      aiSource.value = result._source || 'ai'
      if (result._error) aiError.value = 'AI 服务异常，已使用预置报告兜底'
    }
  } catch (err) {
    aiError.value = err.message
    if (student.value?.aiReport) {
      aiReport.value = student.value.aiReport
      aiSource.value = 'fallback'
    }
  } finally {
    aiLoading.value = false
  }
}

async function doAddScore() {
  const f = scoreForm.value
  if (!f.subject || !f.exam_name || f.score === '') { scoreMsg.value = '请填写科目、考试名称与分数'; scoreMsgType.value = 'err'; return }
  scoreLoading.value = true
  scoreMsg.value = ''
  try {
    const base64s = f.images.map(img => img.src)
    const r = await addScore(student.value.id, {
      subject: f.subject,
      exam_name: f.exam_name,
      score: Number(f.score),
      images: base64s
    })
    if (r.success) {
      scoreMsg.value = '成绩已添加' + (base64s.length ? `（含${base64s.length}张图片）` : ''); scoreMsgType.value = 'ok'
      f.subject = ''; f.exam_name = ''; f.score = ''; f.images = []
      student.value = await getStudent(student.value.id)
    } else { scoreMsg.value = r.error || '添加失败'; scoreMsgType.value = 'err' }
  } catch (e) { scoreMsg.value = e.message; scoreMsgType.value = 'err' }
  scoreLoading.value = false
}

async function exportPDF() {
  await nextTick()
  window.print()
}
</script>

<style scoped>
.ai-loading { text-align: center; padding: 24px; }
.ai-loading p { color: var(--muted); margin-top: 12px; }
.loading-dots { display: inline-flex; gap: 6px; }
.loading-dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.score-form { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.score-form .select, .score-form .input {
  padding: 9px 12px; border: 1.5px solid #e0e4ea; border-radius: 8px; font-size: 14px;
  color: var(--text); background: #fff; outline: none;
}
.score-form .input { width: 150px; }
.msg { padding: 10px 16px; border-radius: 8px; margin-top: 12px; font-size: 14px; }
.msg.ok { background: #e8f6ef; color: var(--primary); }
.msg.err { background: #fbe9e9; color: var(--danger); }

/* 图片附件 */
.img-attach { margin-top: 10px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.img-label { cursor: pointer; }
.btn-sm { padding: 5px 12px; font-size: 13px; }
.img-preview-list { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.img-thumb { position: relative; }
.img-thumb img { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; border: 1px solid #e0e4ea; }
.img-remove {
  position: absolute; top: -6px; right: -6px;
  width: 18px; height: 18px; border-radius: 50%; background: #ef4444; color: #fff;
  border: none; cursor: pointer; font-size: 10px; line-height: 18px; text-align: center;
  padding: 0;
}

/* 弹窗 */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.modal { background: #fff; border-radius: 12px; width: 90%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #eee; }
.modal-head h3 { margin: 0; font-size: 16px; }
.modal-close { background: none; border: none; cursor: pointer; font-size: 18px; color: #999; padding: 0; }
.modal-body { padding: 16px 20px; max-height: 70vh; overflow-y: auto; }
.score-row-list { display: flex; flex-direction: column; gap: 8px; }
.score-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; font-size: 14px; }
.score-row span:last-child { font-weight: 600; color: var(--primary); }
.exam-images { margin-top: 12px; }
.exam-img-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.exam-img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: zoom-in; border: 1px solid #e0e4ea; }
.preview-img { max-width: 95vw; max-height: 95vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
</style>
