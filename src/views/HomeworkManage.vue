<template>
  <div>
    <!-- ============ 顶部操作区 ============ -->
    <div class="card">
      <div class="row between">
        <div>
          <h2 style="margin-bottom:4px">作业管理</h2>
          <p class="sub" style="margin:0">
            按「每次作业」记录每个人的提交情况，随时看清<span class="hl">这一次谁没交</span>
          </p>
        </div>
        <div class="row">
          <select v-if="isAdmin" v-model="classFilter" class="select" @change="load">
            <option value="">全部班级</option>
            <option v-for="c in classrooms" :key="c" :value="c">{{ c }}</option>
          </select>
          <span v-else-if="classrooms.length" class="class-chip">班级：{{ classrooms[0] }}</span>
          <button class="btn outline" @click="showImport = !showImport">
            📥 批量录入
          </button>
          <button class="btn primary" @click="openCreate">＋ 新建作业</button>
        </div>
      </div>
    </div>

    <!-- ============ 统计概览 ============ -->
    <div class="grid cols-3">
      <div class="card stat-card">
        <div class="stat-num" style="color:var(--primary)">{{ list.length }}</div>
        <div class="sub">近期作业次数</div>
      </div>
      <div class="card stat-card">
        <div class="stat-num" :style="{ color: avgRate < 90 ? 'var(--warn)' : 'var(--primary)' }">{{ avgRate }}%</div>
        <div class="sub">平均提交率</div>
      </div>
      <div class="card stat-card">
        <div class="stat-num" :style="{ color: totalMissing ? 'var(--danger)' : 'var(--primary)' }">{{ totalMissing }}</div>
        <div class="sub">累计未交人次</div>
      </div>
    </div>

    <!-- ============ 批量录入（CSV） ============ -->
    <div v-if="showImport" class="card">
      <div class="row between">
        <h2 style="margin:0">批量录入作业数据</h2>
        <button class="modal-close" title="收起" @click="showImport = false">✕</button>
      </div>
      <p class="sub" style="margin:6px 0 14px">
        支持两种 CSV：<strong>汇总式</strong>（只记应交/未交次数）与<strong>明细式</strong>（记每次作业每人状态）。
        系统会根据表头自动识别，编码支持 UTF-8 与 GBK。
      </p>

      <div class="csv-actions">
        <button class="btn outline" @click="downloadTemplate('summary')">下载汇总模板</button>
        <button class="btn outline" @click="downloadTemplate('detail')">下载明细模板</button>
        <label class="btn primary">
          <input type="file" accept=".csv,text/csv" hidden @change="onFile" />
          选择 CSV 文件
        </label>
        <span v-if="importLoading" class="sub">解析中…</span>
      </div>

      <div v-if="importError" class="msg err" style="margin-top:14px">{{ importError }}</div>

      <div v-if="importResult" class="result-box" :class="importResult.errors?.length ? 'warn' : 'ok'">
        <div>
          导入完成：识别为<strong>{{ importResult.mode === 'detail' ? '明细式' : '汇总式' }}</strong>，
          成功 {{ importResult.imported }} 条<template v-if="importResult.skipped">，跳过 {{ importResult.skipped }} 条</template>
          <template v-if="importResult.summaryUpdated">，已同步 {{ importResult.summaryUpdated }} 名学生的提交率</template>
        </div>
        <ul v-if="importResult.errors && importResult.errors.length" class="err-list">
          <li v-for="(e, i) in importResult.errors.slice(0, 10)" :key="i">第 {{ e.row }} 行：{{ e.reason }}</li>
        </ul>
        <div v-if="importResult.errors && importResult.errors.length > 10" class="sub">
          … 共 {{ importResult.errors.length }} 条错误
        </div>
      </div>

      <div class="tip-box">
        <div><strong>汇总式</strong>（没有明细数据时用）：</div>
        <pre>学号,应交次数,未交次数
2024001,20,2
2024002,20,0</pre>
        <div style="margin-top:10px"><strong>明细式</strong>（推荐，可回答「谁没交」）：</div>
        <pre>作业标题,科目,日期,学号,状态
第三单元练习,数学,2026-09-10,2024001,已交
第三单元练习,数学,2026-09-10,2024002,未交</pre>
        <div class="sub" style="margin-top:6px">状态可填：已交 / 补交 / 未交 / 免交 / 待标记</div>
      </div>
    </div>

    <!-- ============ 作业列表 ============ -->
    <div class="card">
      <div class="row between" style="margin-bottom:14px">
        <h2 style="margin:0">作业记录</h2>
        <span class="spacer"></span>
        <button class="btn outline sm" :disabled="loading" @click="load">
          {{ loading ? '加载中…' : '🔄 刷新' }}
        </button>
      </div>

      <div v-if="loadError" class="msg err">{{ loadError }}</div>

      <div v-if="!loading && !list.length && !loadError" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>还没有作业记录</p>
        <p class="sub">点击右上角「新建作业」，选择班级与截止日期后即可逐个标记谁交了、谁没交</p>
      </div>

      <div v-for="a in list" :key="a.id" class="hw-card">
        <div class="hw-head">
          <div class="hw-title">{{ a.title }}</div>
          <span v-if="a.subject" class="badge">{{ a.subject }}</span>
          <span class="hw-date">截止 {{ a.dueDate }}</span>
          <span class="spacer"></span>
          <button class="btn outline sm" @click="openMark(a)">标记提交情况</button>
          <button class="btn danger sm" @click="askDelete(a)">删除</button>
        </div>

        <!-- 提交进度 -->
        <div class="hw-progress">
          <span class="hw-bar">
            <i :style="{ width: Math.round(a.stats.rate * 100) + '%' }"
               :class="{ low: a.stats.rate < 0.9 }"></i>
          </span>
          <span class="hw-rate" :class="{ low: a.stats.rate < 0.9 }">
            {{ Math.round(a.stats.rate * 100) }}%
          </span>
          <span class="hw-counts">
            已交 {{ a.stats.submittedTotal }} · 未交 {{ a.stats.missing }}
            <template v-if="a.stats.pending"> · 待标记 {{ a.stats.pending }}</template>
            <template v-if="a.stats.exempt"> · 免交 {{ a.stats.exempt }}</template>
          </span>
        </div>

        <!-- 未交名单：直接回答「这次谁没交」 -->
        <div v-if="a.notSubmitted.length" class="hw-names">
          <span class="names-label danger">未交 {{ a.notSubmitted.length }} 人</span>
          <span v-for="s in a.notSubmitted" :key="s.id" class="name-chip danger">{{ s.name }}</span>
        </div>
        <div v-if="a.lateStudents.length" class="hw-names">
          <span class="names-label warn">补交 {{ a.lateStudents.length }} 人</span>
          <span v-for="s in a.lateStudents" :key="s.id" class="name-chip warn">{{ s.name }}</span>
        </div>
        <div v-if="!a.notSubmitted.length && a.stats.total > 0" class="hw-names">
          <span class="names-label ok">✓ 全员已交</span>
        </div>
        <div v-else-if="!a.stats.total && a.stats.pending" class="hw-names">
          <span class="sub">尚未标记（{{ a.stats.pending }} 人待处理）</span>
        </div>
      </div>
    </div>

    <!-- ============ 新建作业 ============ -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-head">
          <h3>新建作业</h3>
          <button class="modal-close" @click="showCreate = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>班级 *</label>
            <select v-if="isAdmin" v-model="createForm.className" class="select">
              <option value="">请选择班级</option>
              <option v-for="c in classrooms" :key="c" :value="c">{{ c }}</option>
            </select>
            <input v-else class="input" :value="createForm.className" disabled />
          </div>
          <div class="field">
            <label>作业标题 *</label>
            <input v-model="createForm.title" class="input" placeholder="如 第三单元练习册 P12-P15" />
          </div>
          <div class="field">
            <label>科目</label>
            <select v-model="createForm.subject" class="select">
              <option value="">不指定</option>
              <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="field">
            <label>截止日期 *</label>
            <input v-model="createForm.dueDate" type="date" class="input" />
          </div>
          <p v-if="createMsg" class="msg" :class="createMsgType">{{ createMsg }}</p>
          <div class="modal-actions">
            <button class="btn outline" @click="showCreate = false">取消</button>
            <button class="btn primary" :disabled="createLoading" @click="doCreate">
              {{ createLoading ? '创建中…' : '创建并开始标记' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 标记提交情况 ============ -->
    <div v-if="markOpen" class="modal-overlay" @click.self="closeMark">
      <div class="modal modal-wide">
        <div class="modal-head">
          <h3>{{ markAssignment?.title }} <span class="sub">· {{ markAssignment?.dueDate }}</span></h3>
          <button class="modal-close" @click="closeMark">✕</button>
        </div>

        <div class="mark-toolbar">
          <div class="row">
            <button class="btn sm" @click="bulkSet('submitted')">全部标记已交</button>
            <button class="btn outline sm" @click="bulkSet('missing')">全部标记未交</button>
            <button class="btn outline sm" @click="bulkSet('pending')">重置为待标记</button>
          </div>
          <div class="row">
            <div class="seg">
              <button v-for="f in markFilters" :key="f.key"
                      :class="['seg-btn', { active: markFilter === f.key }]"
                      @click="markFilter = f.key">{{ f.label }}</button>
            </div>
          </div>
        </div>

        <p class="mark-hint">
          提示：先「全部标记已交」，再点出没交的那几个人，是查「谁没交」最快的方式。
        </p>

        <div class="mark-body">
          <div v-if="markLoading" class="sub" style="padding:20px;text-align:center">加载名单中…</div>
          <div v-else-if="!visibleRecords.length" class="sub" style="padding:20px;text-align:center">
            {{ markRecords.length ? '当前筛选条件下没有学生' : '该班级还没有学生' }}
          </div>
          <div v-for="r in visibleRecords" :key="r.studentId" class="mark-row">
            <span class="mark-name">{{ r.name }}</span>
            <span class="mark-id sub">{{ r.studentId }}</span>
            <span class="spacer"></span>
            <div class="seg">
              <button v-for="s in statusOptions" :key="s.key"
                      :class="['seg-btn', 'tone-' + s.tone, { active: r.status === s.key }]"
                      @click="setStatus(r, s.key)">{{ s.label }}</button>
            </div>
          </div>
        </div>

        <div class="mark-footer">
          <span class="mark-summary">
            已交 <strong class="ok-text">{{ markStats.submittedTotal }}</strong>
            · 未交 <strong class="danger-text">{{ markStats.missing }}</strong>
            · 待标记 <strong>{{ markStats.pending }}</strong>
          </span>
          <span class="spacer"></span>
          <button class="btn outline" @click="closeMark">取消</button>
          <button class="btn primary" :disabled="markSaving || !dirtyCount" @click="doSaveMark">
            {{ markSaving ? '保存中…' : (dirtyCount ? `保存 ${dirtyCount} 项修改` : '没有修改') }}
          </button>
        </div>
        <p v-if="markMsg" class="msg" :class="markMsgType">{{ markMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRole } from '../api/auth.js'
import {
  getClassrooms, getSubjects, getHomeworkAssignments, createHomeworkAssignment,
  getHomeworkAssignment, saveHomeworkRecords, deleteHomeworkAssignment, importHomework
} from '../api/student.js'
import { readTextFile, parseCSV, headerHas, downloadCSV } from '../utils/csv.js'

const isAdmin = getRole() === 'admin'
const classrooms = ref([])
const subjects = ref([])
const classFilter = ref('')

const list = ref([])
const loading = ref(false)
const loadError = ref('')

// 状态元数据（pending 只作为「未处理」态，不作为按钮选项）
const statusOptions = [
  { key: 'submitted', label: '已交', tone: 'ok' },
  { key: 'late', label: '补交', tone: 'warn' },
  { key: 'missing', label: '未交', tone: 'danger' },
  { key: 'exempt', label: '免交', tone: 'muted' }
]

const avgRate = computed(() => {
  if (!list.value.length) return 0
  const sum = list.value.reduce((a, x) => a + x.stats.rate, 0)
  return Math.round((sum / list.value.length) * 100)
})
const totalMissing = computed(() => list.value.reduce((a, x) => a + x.stats.missing, 0))

function todayStr() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    list.value = await getHomeworkAssignments({ class: classFilter.value, limit: 50 })
    if (!Array.isArray(list.value)) list.value = []
  } catch (e) {
    loadError.value = e.message
    list.value = []
  } finally {
    loading.value = false
  }
}

// ===== 新建作业 =====
const showCreate = ref(false)
const createLoading = ref(false)
const createMsg = ref('')
const createMsgType = ref('ok')
const createForm = ref({ className: '', title: '', subject: '', dueDate: '' })

function openCreate() {
  createMsg.value = ''
  createForm.value = {
    className: classFilter.value || classrooms.value[0] || '',
    title: '',
    subject: '',
    dueDate: todayStr()
  }
  showCreate.value = true
}

async function doCreate() {
  const f = createForm.value
  if (!f.className) { createMsg.value = '请选择班级'; createMsgType.value = 'err'; return }
  if (!f.title.trim()) { createMsg.value = '请填写作业标题'; createMsgType.value = 'err'; return }
  if (!f.dueDate) { createMsg.value = '请选择截止日期'; createMsgType.value = 'err'; return }

  createLoading.value = true
  createMsg.value = ''
  try {
    const r = await createHomeworkAssignment({
      className: f.className, title: f.title.trim(), subject: f.subject, dueDate: f.dueDate
    })
    if (!r.success) { createMsg.value = r.error || '创建失败'; createMsgType.value = 'err'; return }
    showCreate.value = false
    await load()
    const created = list.value.find(a => a.id === r.id)
    if (created) openMark(created)
  } catch (e) {
    createMsg.value = e.message
    createMsgType.value = 'err'
  } finally {
    createLoading.value = false
  }
}

async function askDelete(a) {
  if (!confirm(`确认删除作业「${a.title}」？将同时删除该作业的全部提交记录，并重新计算相关学生的提交率。`)) return
  try {
    const r = await deleteHomeworkAssignment(a.id)
    if (r.success) { await load() } else { loadError.value = r.error || '删除失败' }
  } catch (e) {
    loadError.value = e.message
  }
}

// ===== 标记提交情况 =====
const markOpen = ref(false)
const markLoading = ref(false)
const markSaving = ref(false)
const markAssignment = ref(null)
const markRecords = ref([])
const markOriginal = ref({})
const markFilter = ref('all')
const markMsg = ref('')
const markMsgType = ref('ok')

const markFilters = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待标记' },
  { key: 'missing', label: '未交' }
]

const visibleRecords = computed(() => {
  if (markFilter.value === 'pending') return markRecords.value.filter(r => r.status === 'pending')
  if (markFilter.value === 'missing') return markRecords.value.filter(r => r.status === 'missing')
  return markRecords.value
})

const markStats = computed(() => {
  const c = { submitted: 0, late: 0, missing: 0, exempt: 0, pending: 0 }
  for (const r of markRecords.value) c[r.status] = (c[r.status] || 0) + 1
  const submittedTotal = c.submitted + c.late
  const total = submittedTotal + c.missing
  return { ...c, submittedTotal, total, rate: total ? submittedTotal / total : 0 }
})

const dirtyCount = computed(() =>
  markRecords.value.filter(r => markOriginal.value[r.studentId] !== r.status).length
)

async function openMark(a) {
  markOpen.value = true
  markLoading.value = true
  markMsg.value = ''
  markFilter.value = 'all'
  markAssignment.value = a
  try {
    const d = await getHomeworkAssignment(a.id)
    markAssignment.value = d.assignment
    markRecords.value = d.records || []
    markOriginal.value = Object.fromEntries(markRecords.value.map(r => [r.studentId, r.status]))
  } catch (e) {
    markMsg.value = e.message
    markMsgType.value = 'err'
    markRecords.value = []
  } finally {
    markLoading.value = false
  }
}

function closeMark() {
  if (dirtyCount.value && !confirm('有未保存的修改，确定关闭吗？')) return
  markOpen.value = false
  // 列表上的统计/未交名单可能已变化，回到列表时刷新
  load()
}

function setStatus(r, status) {
  r.status = status
  markMsg.value = ''
}

function bulkSet(status) {
  for (const r of visibleRecords.value) r.status = status
  markMsg.value = ''
}

async function doSaveMark() {
  const changed = markRecords.value.filter(r => markOriginal.value[r.studentId] !== r.status)
  if (!changed.length) return
  markSaving.value = true
  markMsg.value = ''
  try {
    const r = await saveHomeworkRecords(markAssignment.value.id, changed.map(x => ({
      studentId: x.studentId, status: x.status
    })))
    if (!r.success) { markMsg.value = r.error || '保存失败'; markMsgType.value = 'err'; return }
    markOriginal.value = Object.fromEntries(markRecords.value.map(x => [x.studentId, x.status]))
    markMsg.value = `已保存 ${changed.length} 项修改`
    markMsgType.value = 'ok'
    await load()
  } catch (e) {
    markMsg.value = e.message
    markMsgType.value = 'err'
  } finally {
    markSaving.value = false
  }
}

// ===== CSV 批量录入 =====
const showImport = ref(false)
const importLoading = ref(false)
const importError = ref('')
const importResult = ref(null)

function downloadTemplate(kind) {
  if (kind === 'summary') {
    downloadCSV('作业提交汇总导入模板.csv',
      '学号,应交次数,未交次数\n2024001,20,2\n2024002,20,0\n')
  } else {
    downloadCSV('作业提交明细导入模板.csv',
      '作业标题,科目,日期,学号,状态\n第三单元练习册,数学,2026-09-10,2024001,已交\n第三单元练习册,数学,2026-09-10,2024002,未交\n')
  }
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  importError.value = ''
  importResult.value = null
  importLoading.value = true
  try {
    const text = await readTextFile(file)
    const { header, rows } = parseCSV(text)
    if (!rows.length) { importError.value = '文件内容为空或只有表头'; return }

    // 依据表头自动识别模式：出现「作业标题/状态」即视为明细式
    const mode = headerHas(header, ['作业标题', '标题', '状态', '提交状态']) ? 'detail' : 'summary'

    if (mode === 'summary' && !headerHas(header, ['应交', '未交'])) {
      importError.value = '无法识别表头。汇总式需包含「学号,应交次数,未交次数」；明细式需包含「作业标题,日期,学号,状态」'
      return
    }

    const r = await importHomework(mode, rows)
    importResult.value = r
    await load()
  } catch (err) {
    importError.value = err.message
  } finally {
    importLoading.value = false
  }
}

onMounted(async () => {
  try { classrooms.value = await getClassrooms() } catch (e) { /* 忽略：无班级时列表为空 */ }
  try { subjects.value = await getSubjects() } catch (e) { /* 忽略 */ }
  if (!isAdmin) classFilter.value = classrooms.value[0] || ''
  await load()
})
</script>

<style scoped>
.hl { color: var(--primary); font-weight: 600; }
.class-chip {
  font-size: 13px; color: var(--primary); background: var(--primary-light);
  padding: 5px 12px; border-radius: 20px; font-weight: 500;
}

/* 统计卡 */
.stat-card { margin: 0; text-align: center; padding: 18px; }
.stat-num { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }

/* 作业卡片 */
.hw-card {
  border: 1px solid var(--line); border-radius: var(--radius-sm);
  padding: 14px 16px; margin-bottom: 12px; background: #fff;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.hw-card:hover { border-color: rgba(47, 125, 110, .3); box-shadow: var(--shadow-sm); }
.hw-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hw-title { font-weight: 600; font-size: 15px; }
.hw-date { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }

.hw-progress { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.hw-bar { flex: 1; min-width: 120px; height: 8px; border-radius: 99px; background: #eef1f5; overflow: hidden; }
.hw-bar i { display: block; height: 100%; border-radius: 99px; background: var(--primary); transition: width var(--transition-base); }
.hw-bar i.low { background: var(--warn); }
.hw-rate { font-weight: 600; color: var(--primary); font-variant-numeric: tabular-nums; min-width: 42px; }
.hw-rate.low { color: var(--warn); }
.hw-counts { font-size: 12px; color: var(--muted); }

/* 未交 / 补交名单 */
.hw-names { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.names-label { font-size: 12px; font-weight: 600; }
.names-label.danger { color: var(--danger); }
.names-label.warn { color: var(--warn); }
.names-label.ok { color: var(--primary); }
.name-chip {
  font-size: 12px; padding: 2px 9px; border-radius: 20px;
  background: var(--bg); color: var(--text); border: 1px solid var(--line);
}
.name-chip.danger { background: var(--danger-light); color: var(--danger); border-color: transparent; font-weight: 500; }
.name-chip.warn { background: var(--warn-light); color: var(--warn); border-color: transparent; }

/* 空态 */
.empty-state { text-align: center; padding: 36px 16px; color: var(--muted); }
.empty-icon { font-size: 34px; opacity: .5; margin-bottom: 8px; }
.empty-state p { font-size: 14px; }
.empty-state .sub { font-size: 12px; max-width: 380px; margin: 4px auto 0; }

/* CSV 面板 */
.csv-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tip-box {
  background: var(--bg); border-radius: var(--radius-sm); padding: 14px 16px;
  font-size: 13px; color: var(--muted); margin-top: 14px;
}
.tip-box pre {
  margin: 6px 0 0; font-size: 12px; color: var(--text);
  background: #fff; border: 1px solid var(--line); border-radius: 6px;
  padding: 8px 10px; overflow-x: auto; font-variant-numeric: tabular-nums;
}
.result-box { padding: 12px 16px; border-radius: var(--radius-sm); margin-top: 14px; font-size: 14px; }
.result-box.ok { background: var(--primary-light); color: var(--primary-dark); }
.result-box.warn { background: var(--warn-light); color: var(--warn); }
.err-list { margin: 6px 0 0 20px; font-size: 13px; }
.msg { padding: 10px 16px; border-radius: var(--radius-sm); margin: 12px 0 0; font-size: 14px; }
.msg.ok { background: var(--primary-light); color: var(--primary-dark); }
.msg.err { background: var(--danger-light); color: var(--danger); }

/* 弹窗 */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, .45); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: #fff; border-radius: var(--radius); width: 100%; max-width: 440px;
  box-shadow: var(--shadow-lg); display: flex; flex-direction: column; max-height: 92vh;
}
.modal-wide { max-width: 620px; }
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--line);
}
.modal-head h3 { margin: 0; font-size: 16px; color: var(--text); }
.modal-close { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--muted); padding: 4px 6px; }
.modal-body { padding: 16px 20px; overflow-y: auto; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.field .input, .field .select { width: 100%; }

/* 标记弹窗 */
.mark-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 12px 20px; flex-wrap: wrap;
  border-bottom: 1px solid var(--line); background: var(--bg);
}
.mark-hint { font-size: 12px; color: var(--muted); padding: 8px 20px 0; }
.mark-body { padding: 8px 20px 12px; overflow-y: auto; flex: 1; min-height: 120px; }
.mark-row {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 0; border-bottom: 1px dashed var(--line);
}
.mark-row:last-child { border-bottom: none; }
.mark-name { font-size: 14px; font-weight: 500; min-width: 64px; }
.mark-id { font-size: 12px; font-variant-numeric: tabular-nums; }
.mark-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--line); flex-wrap: wrap;
}
.mark-summary { font-size: 13px; color: var(--muted); }
.mark-summary strong { font-variant-numeric: tabular-nums; }
.ok-text { color: var(--primary); }
.danger-text { color: var(--danger); }

/* 分段控件 */
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
.seg-btn {
  border: none; background: #fff; color: var(--muted); cursor: pointer;
  font-size: 12px; font-family: inherit; padding: 5px 10px;
  border-right: 1px solid var(--line);
  transition: background var(--transition-fast), color var(--transition-fast);
}
.seg-btn:last-child { border-right: none; }
.seg-btn:hover { background: var(--bg); }
.seg-btn.active { font-weight: 600; color: #fff; background: var(--primary); }
.seg-btn.tone-ok.active { background: var(--primary); }
.seg-btn.tone-warn.active { background: var(--warn); }
.seg-btn.tone-danger.active { background: var(--danger); }
.seg-btn.tone-muted.active { background: var(--muted); }

@media (max-width: 640px) {
  .mark-row { flex-wrap: wrap; }
  .mark-row .spacer { display: none; }
  .seg-btn { padding: 6px 9px; }
  .hw-head .btn { flex: 1; }
}
</style>
