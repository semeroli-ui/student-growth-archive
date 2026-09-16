<template>
  <div>
    <!-- ================= 学生视角 =================
         设计意图：学生只能看到自己。班级名单、同学提交率、
         班级平均统计都属于教师的管理数据，不在这里出现。
         后端 /students 同样只返回本人，前端只是不做无谓的请求。 -->
    <template v-if="isStudent">
      <div class="card">
        <h2 style="margin:0">我的成长档案</h2>
        <div v-if="loadError" class="msg err">{{ loadError }}</div>
        <div v-else-if="!me" class="empty-state">
          <div class="empty-icon">🎒</div>
          <p>暂时读不到你的档案信息</p>
          <p class="sub">请联系老师确认你的账号是否已关联学生档案</p>
        </div>
        <div v-else class="me-row">
          <div class="avatar" style="width:52px;height:52px;font-size:20px">{{ me.name.charAt(0) }}</div>
          <div class="meta">
            <div class="name">{{ me.name }}</div>
            <div class="sub">{{ me.className }} · 学号 {{ me.id }}</div>
          </div>
          <span class="spacer"></span>
          <button class="btn primary" @click="$router.push('/student/' + me.id)">查看完整档案 →</button>
        </div>
      </div>

      <div v-if="me" class="grid cols-2">
        <div class="card stat-card">
          <div class="stat-label">我的作业提交率</div>
          <div class="stat-num" :style="{ color: (me.homeworkRate || 0) < 0.9 ? 'var(--warn)' : 'var(--primary)' }">
            {{ Math.round((me.homeworkRate || 0) * 100) }}<span class="stat-unit">%</span>
          </div>
          <div class="sub">{{ (me.homeworkRate || 0) < 0.9 ? '继续保持，按时提交作业' : '很稳定，继续保持' }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">最近一次考试</div>
          <template v-if="myLastExam.subjects.length">
            <div class="stat-text">{{ myLastExam.exam }}</div>
            <div class="score-chips">
              <span v-for="s in myLastExam.subjects" :key="s.subject" class="chip">
                {{ s.subject }} <strong>{{ s.score }}</strong>
              </span>
            </div>
          </template>
          <div v-else class="sub" style="margin-top:10px">还没有成绩记录</div>
        </div>
      </div>
    </template>

    <!-- ================= 教师 / 管理员视角 ================= -->
    <template v-else>
      <div class="card">
        <div class="row between">
          <h2 style="margin:0">班级概览 · {{ className || '—' }}</h2>
          <div class="row">
            <button v-if="isStaff" class="btn outline" @click="$router.push('/homework')">
              📋 作业管理
            </button>
          </div>
        </div>

        <div class="grid cols-3" style="margin-top:16px">
          <div class="card stat-card">
            <div class="stat-num" style="color:var(--primary)">{{ list.length }}</div>
            <div class="sub">在校学生</div>
          </div>
          <div class="card stat-card">
            <div class="stat-num" :style="{ color: avgRate !== null && avgRate < 90 ? 'var(--warn)' : 'var(--primary)' }">
              {{ avgRate === null ? '—' : avgRate + '%' }}
            </div>
            <div class="sub">平均作业提交率</div>
          </div>
          <div class="card stat-card" :class="{ clickable: needAttention && isStaff }"
               :title="needAttention && isStaff ? '去作业管理查看谁没交' : ''"
               @click="needAttention && isStaff && $router.push('/homework')">
            <div class="stat-num" :style="{ color: needAttention ? 'var(--danger)' : 'var(--primary)' }">
              {{ needAttention }}
            </div>
            <div class="sub">需关注学生<template v-if="needAttention && isStaff">（点击查看）</template></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>学生列表</h2>
        <div v-if="loadError" class="msg err">{{ loadError }}</div>
        <div v-else-if="!list.length" class="empty-state">
          <div class="empty-icon">🎒</div>
          <p>还没有学生数据</p>
          <p class="sub">可在「管理 → 学生管理」中单条添加或批量导入学生</p>
        </div>
        <div v-else class="grid">
          <div
            v-for="s in list"
            :key="s.id"
            class="student-card"
            @click="$router.push('/student/' + s.id)"
          >
            <div class="avatar">{{ s.name.charAt(0) }}</div>
            <div class="meta">
              <div class="name">{{ s.name }}</div>
              <div class="sub">{{ s.className }}</div>
            </div>
            <span class="badge" :class="{ warn: s.homeworkRate < 0.9 }">
              作业 {{ Math.round(s.homeworkRate * 100) }}%
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getStudents } from '../api/student.js'
import { getRole } from '../api/auth.js'

const role = getRole()
const isStaff = role === 'teacher' || role === 'admin'
const isStudent = role === 'student'

const list = ref([])
const className = ref('')
const loadError = ref('')

// 学生视角：后端只返回本人，这里取第一条即为「我」
const me = computed(() => (isStudent ? list.value[0] || null : null))

// 把最近一次考试的科目分数摊平，便于逐科展示
const myLastExam = computed(() => {
  const last = me.value?.lastExam || {}
  const { exam, _images, ...scores } = last
  const subjects = Object.keys(scores)
    .filter(k => k !== 'exam' && !k.startsWith('_'))
    .map(k => ({ subject: k, score: scores[k] }))
    .filter(s => s.score !== null && s.score !== undefined && s.score !== '')
  return { exam: exam || '', subjects }
})

// 无学生时返回 null（而不是 NaN%），模板显示「—」
const avgRate = computed(() => {
  if (!list.value.length) return null
  const sum = list.value.reduce((a, s) => a + (Number(s.homeworkRate) || 0), 0)
  return Math.round((sum / list.value.length) * 100)
})

const needAttention = computed(() => list.value.filter(s => (Number(s.homeworkRate) || 0) < 0.9).length)

onMounted(async () => {
  try {
    list.value = await getStudents()
    if (!isStudent && list.value.length) className.value = list.value[0].className
  } catch (e) {
    loadError.value = e.message
    list.value = []
  }
})
</script>

<style scoped>
.stat-card { margin: 0; text-align: center; padding: 18px; }
.stat-num { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat-unit { font-size: 16px; font-weight: 600; margin-left: 1px; }
.stat-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.stat-text { font-size: 17px; font-weight: 600; }
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { border-color: rgba(47, 125, 110, .3); box-shadow: var(--shadow-md); }
.empty-state { text-align: center; padding: 36px 16px; color: var(--muted); }
.empty-icon { font-size: 34px; opacity: .5; margin-bottom: 8px; }
.empty-state p { font-size: 14px; }
.empty-state .sub { font-size: 12px; }
.msg { padding: 10px 16px; border-radius: var(--radius-sm); font-size: 14px; }
.msg.err { background: var(--danger-light); color: var(--danger); }

/* 学生视角的本人信息行 */
.me-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 16px; }

/* 最近考试的分科分数胶囊 */
.score-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 10px; }
.chip {
  display: inline-flex; align-items: baseline; gap: 4px;
  background: var(--bg); border: 1px solid var(--line);
  border-radius: 99px; padding: 3px 10px;
  font-size: 12px; color: var(--muted);
}
.chip strong { color: var(--text); font-size: 13px; font-variant-numeric: tabular-nums; }
</style>
