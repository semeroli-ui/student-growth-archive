<template>
  <div>
    <div class="card">
      <h2>班级概览 · {{ className }}</h2>
      <div class="grid cols-3">
        <div class="card" style="margin:0">
          <div style="font-size:28px;font-weight:700;color:var(--primary)">{{ list.length }}</div>
          <div class="sub" style="color:var(--muted)">在校学生</div>
        </div>
        <div class="card" style="margin:0">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">{{ avgRate }}%</div>
          <div class="sub" style="color:var(--muted)">平均作业提交率</div>
        </div>
        <div class="card" style="margin:0">
          <div style="font-size:28px;font-weight:700;color:var(--warn)">{{ needAttention }}</div>
          <div class="sub" style="color:var(--muted)">需关注学生</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>学生列表</h2>
      <div class="grid">
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

const list = ref([])
const className = ref('')
const avgRate = ref(0)
const needAttention = ref(0)

onMounted(async () => {
  list.value = await getStudents()
  if (list.value.length) className.value = list.value[0].className
  const sum = list.value.reduce((a, s) => a + s.homeworkRate, 0)
  avgRate.value = Math.round((sum / list.value.length) * 100)
  needAttention.value = list.value.filter(s => s.homeworkRate < 0.9).length
})
</script>
