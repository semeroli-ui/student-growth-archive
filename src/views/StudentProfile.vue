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
        <p>{{ aiReport.profile }}</p>
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
import { getStudent, generateAIReport } from '../api/student.js'
import ScoreTrendChart from '../components/ScoreTrendChart.vue'
import BehaviorRadar from '../components/BehaviorRadar.vue'

const route = useRoute()
const student = ref(null)
const loading = ref(true)
const aiReport = ref(null)
const aiLoading = ref(false)
const aiSource = ref('')
const aiError = ref('')

onMounted(async () => {
  student.value = await getStudent(route.params.id)
  loading.value = false
  // 初始展示已有报告
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
      aiReport.value = result
      aiSource.value = result._source || 'ai'
      if (result._error) aiError.value = 'AI 服务异常，已使用预置报告兜底'
    }
  } catch (err) {
    aiError.value = err.message
    // 兜底用原数据
    if (student.value?.aiReport) {
      aiReport.value = student.value.aiReport
      aiSource.value = 'fallback'
    }
  } finally {
    aiLoading.value = false
  }
}

async function exportPDF() {
  await nextTick()
  window.print()
}
</script>

<style scoped>
.ai-loading {
  text-align: center;
  padding: 24px;
}
.ai-loading p {
  color: var(--muted);
  margin-top: 12px;
}
.loading-dots {
  display: inline-flex;
  gap: 6px;
}
.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  animation: bounce 1.2s infinite ease-in-out;
}
.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
