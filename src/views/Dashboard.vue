<template>
  <div>
    <!-- 统计卡片 -->
    <div class="card">
      <h2>班级概览 · {{ className }}</h2>
      <div class="grid cols-3">
        <div class="card stat-card">
          <div class="stat-value" style="color:var(--primary)">{{ list.length }}</div>
          <div class="stat-label">在校学生</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" style="color:var(--accent)">{{ avgRate }}%</div>
          <div class="stat-label">平均作业提交率</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" style="color:var(--warn)">{{ needAttention }}</div>
          <div class="stat-label">需关注学生</div>
        </div>
      </div>
    </div>

    <!-- 学生列表 + 搜索筛选 -->
    <div class="card">
      <h2>学生列表</h2>

      <div class="toolbar">
        <input
          v-model="keyword"
          class="search-box"
          placeholder="搜索姓名 / 学号…"
        />
        <div class="filter-chips">
          <span
            v-for="f in filters"
            :key="f.key"
            class="chip"
            :class="{ active: activeFilter === f.key }"
            @click="activeFilter = f.key"
          >{{ f.label }}</span>
        </div>
      </div>

      <div v-if="filteredList.length === 0" class="empty-hint">
        没有匹配的学生
      </div>

      <div class="grid">
        <div
          v-for="s in filteredList"
          :key="s.id"
          class="student-card"
          @click="$router.push('/student/' + s.id)"
        >
          <div class="avatar">{{ s.name.charAt(0) }}</div>
          <div class="meta">
            <div class="name">{{ s.name }}</div>
            <div class="sub">{{ s.className }} · {{ s.id }}</div>
          </div>
          <span class="badge" :class="{ warn: s.homeworkRate < 0.9, danger: s.homeworkRate < 0.8 }">
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

const list = ref([])
const className = ref('')
const keyword = ref('')
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: '全部' },
  { key: 'attention', label: '需关注' },
  { key: 'good', label: '表现良好' }
]

const filteredList = computed(() => {
  let r = list.value
  // 关键词搜索
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    r = r.filter(s =>
      s.name.toLowerCase().includes(kw) ||
      s.id.toLowerCase().includes(kw)
    )
  }
  // 筛选
  if (activeFilter.value === 'attention') {
    r = r.filter(s => s.homeworkRate < 0.9)
  } else if (activeFilter.value === 'good') {
    r = r.filter(s => s.homeworkRate >= 0.95)
  }
  return r
})

const avgRate = computed(() => {
  if (!list.value.length) return 0
  const sum = list.value.reduce((a, s) => a + s.homeworkRate, 0)
  return Math.round((sum / list.value.length) * 100)
})

const needAttention = computed(() =>
  list.value.filter(s => s.homeworkRate < 0.9).length
)

onMounted(async () => {
  list.value = await getStudents()
  if (list.value.length) className.value = list.value[0].className
})
</script>
