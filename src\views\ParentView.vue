<template>
  <div>
    <div v-if="loading" class="card">加载中…</div>

    <div v-else-if="!children.length" class="card empty">
      <div class="empty-emoji">👪</div>
      <p>您还没有关联的孩子。</p>
      <p class="sub">请联系班主任，提供您的账号以便关联孩子的档案。</p>
    </div>

    <div v-else>
      <!-- 孩子切换 -->
      <div v-if="children.length > 1" class="card">
        <div class="row">
          <span class="sub">我的孩子：</span>
          <select v-model="selectedId" class="select" @change="loadChild">
            <option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}（{{ c.className }}）</option>
          </select>
        </div>
      </div>

      <div v-if="student" class="parent-wrap">
        <div class="card">
          <div class="stu-head">
            <div class="avatar">{{ student.name.charAt(0) }}</div>
            <div>
              <h2 style="margin:0">{{ student.name }}</h2>
              <div class="sub">{{ student.className }} · 学号 {{ student.id }}</div>
            </div>
            <span class="spacer" style="flex:1"></span>
            <span class="badge" :class="{ warn: student.homework.rate < 0.9 }">
              作业提交 {{ Math.round(student.homework.rate * 100) }}%
            </span>
          </div>
        </div>

        <div class="grid cols-2">
          <div class="card">
            <h3>成绩趋势</h3>
            <ScoreTrendChart :scores="student.scores" />
          </div>
          <div class="card">
            <h3>课堂表现</h3>
            <BehaviorRadar :behavior="student.behavior" />
          </div>
        </div>

        <div class="card">
          <h3>成长事件</h3>
          <div v-if="!student.events.length" class="sub">暂无记录</div>
          <div v-else class="timeline">
            <div v-for="(e, i) in student.events" :key="i" class="timeline-item">
              <div class="date">{{ e.date }} · <span class="badge" :class="{ warn: e.type === '提醒' }">{{ e.type }}</span></div>
              <div>{{ e.content }}</div>
            </div>
          </div>
        </div>

        <div class="card notice">
          🔒 成长心理画像仅教师可见，家长端不展示。如需沟通，请联系班主任。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getParentChildren, getParentStudent } from '../api/student.js'
import ScoreTrendChart from '../components/ScoreTrendChart.vue'
import BehaviorRadar from '../components/BehaviorRadar.vue'

const loading = ref(true)
const children = ref([])
const selectedId = ref('')
const student = ref(null)

async function loadChild() {
  if (!selectedId.value) return
  student.value = await getParentStudent(selectedId.value)
}

onMounted(async () => {
  try {
    children.value = await getParentChildren()
    if (children.value.length) {
      selectedId.value = children.value[0].id
      await loadChild()
    }
  } catch (e) {
    children.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.parent-wrap { display: block; }
.stu-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.avatar { width: 52px; height: 52px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
.sub { color: var(--muted); font-size: 13px; }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.select { padding: 8px 12px; border: 1.5px solid #e0e4ea; border-radius: 8px; font-size: 14px; color: var(--text); background: #fff; outline: none; }
.select:focus { border-color: var(--primary); }
.grid.cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid.cols-2 .card { margin: 0; }
h3 { margin-top: 0; color: var(--text); font-size: 16px; }
.timeline { border-left: 3px solid var(--bg); padding-left: 16px; margin-top: 8px; }
.timeline-item { margin-bottom: 14px; }
.date { font-size: 13px; color: var(--muted); margin-bottom: 2px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 6px; background: var(--bg); color: var(--primary); font-size: 12px; }
.badge.warn { background: #fbe9e9; color: var(--danger); }
.notice { background: #fdf3e0; color: var(--warn); font-size: 13px; }
.empty { text-align: center; padding: 48px 24px; }
.empty-emoji { font-size: 48px; margin-bottom: 12px; }
.spacer { flex: 1; }

@media (max-width: 768px) {
  .grid.cols-2 { grid-template-columns: 1fr; }
}
</style>
