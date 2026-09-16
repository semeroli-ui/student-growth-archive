<template>
  <div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getStudents } from '../api/student.js'
import { getRole } from '../api/auth.js'

const isStaff = getRole() === 'teacher' || getRole() === 'admin'
const list = ref([])
const className = ref('')
const loadError = ref('')

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
    if (list.value.length) className.value = list.value[0].className
  } catch (e) {
    loadError.value = e.message
    list.value = []
  }
})
</script>

<style scoped>
.stat-card { margin: 0; text-align: center; padding: 18px; }
.stat-num { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { border-color: rgba(47, 125, 110, .3); box-shadow: var(--shadow-md); }
.empty-state { text-align: center; padding: 36px 16px; color: var(--muted); }
.empty-icon { font-size: 34px; opacity: .5; margin-bottom: 8px; }
.empty-state p { font-size: 14px; }
.empty-state .sub { font-size: 12px; }
.msg { padding: 10px 16px; border-radius: var(--radius-sm); font-size: 14px; }
.msg.err { background: var(--danger-light); color: var(--danger); }
</style>
