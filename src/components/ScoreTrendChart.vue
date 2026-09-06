<template>
  <div ref="el" class="chart"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({ scores: { type: Array, required: true } })
const el = ref(null)
let chart = null

onMounted(() => {
  chart = echarts.init(el.value)
  const exams = props.scores.map(s => s.exam)
  const subjects = ['数学', '英语', '语文']
  const colors = { 数学: '#2f7d6e', 英语: '#3a7bd5', 语文: '#e8843c' }
  const series = subjects.map(sub => ({
    name: sub,
    type: 'line',
    smooth: true,
    data: props.scores.map(s => s[sub]),
    itemStyle: { color: colors[sub] }
  }))
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: subjects, bottom: 0 },
    grid: { left: 36, right: 16, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: exams },
    yAxis: { type: 'value', min: 40, max: 100 },
    series
  })
  window.addEventListener('resize', () => chart && chart.resize())
})

onBeforeUnmount(() => { chart && chart.dispose() })
</script>
