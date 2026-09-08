<template>
  <div v-if="loading">加载中…</div>
  <div v-else-if="!student" class="card">未找到该学生档案。</div>
  <div v-else>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px" class="no-print">
      <a class="back" href="#/" @click.prevent="$router.push('/')">← 返回班级概览</a>
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
        <h2>成绩趋势</h2>
        <ScoreTrendChart :scores="student.scores" />
      </div>
      <div class="card">
        <h2>课堂行为雷达</h2>
        <BehaviorRadar :behavior="student.behavior" />
      </div>
    </div>

    <!-- AI 报告 -->
    <div class="card">
      <h2>AI 成长画像与建议</h2>
      <p>{{ student.aiReport.profile }}</p>
      <div style="margin-top:12px">
        <strong class="weakness">薄弱点：</strong>
        <ul>
          <li v-for="(w, i) in student.aiReport.weaknesses" :key="i" class="weakness">
            {{ w.subject }} — {{ w.reason }}
          </li>
        </ul>
      </div>
      <div style="margin-top:12px">
        <strong>个性化建议：</strong>
        <div v-for="(s, i) in student.aiReport.suggestions" :key="i" class="suggestion">{{ s }}</div>
      </div>
      <div class="suggestion" style="border-color:var(--accent);background:var(--accent-light)">
        <strong>家校沟通话术：</strong>{{ student.aiReport.talkScript }}
      </div>
      <p style="color:var(--muted);font-size:12px;margin-top:10px">* 以上内容由 AI 生成，仅供参考，以教师判断为准。</p>
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
import { getStudent } from '../api/student.js'
import ScoreTrendChart from '../components/ScoreTrendChart.vue'
import BehaviorRadar from '../components/BehaviorRadar.vue'

const route = useRoute()
const student = ref(null)
const loading = ref(true)

onMounted(async () => {
  student.value = await getStudent(route.params.id)
  loading.value = false
})

// 导出 PDF：用浏览器原生打印，配合 @media print 样式
async function exportPDF() {
  await nextTick()
  window.print()
}
</script>
