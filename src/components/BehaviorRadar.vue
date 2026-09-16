<template>
  <div ref="el" class="chart"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({ behavior: { type: Object, default: () => ({}) } })
const el = ref(null)
let chart = null

// 四个标准维度：缺少数据时补 0，保证雷达图始终显示完整四维
const DIMENSIONS = [
  { key: '举手', alias: ['raise_hand'] },
  { key: '专注', alias: ['focus'] },
  { key: '合作', alias: ['cooperation'] },
  { key: '作业质量', alias: ['homework_quality'] }
]

function pickValue(src, dim) {
  if (!src) return 0
  if (src[dim.key] !== undefined && src[dim.key] !== null) return Number(src[dim.key]) || 0
  for (const a of dim.alias) {
    if (src[a] !== undefined && src[a] !== null) return Number(src[a]) || 0
  }
  return 0
}

function render() {
  if (!chart) return
  const beh = props.behavior || {}
  const indicators = DIMENSIONS.map(d => ({ name: d.key, max: 5 }))
  const values = DIMENSIONS.map(d => pickValue(beh, d))
  const hasData = Object.keys(beh).length > 0
  chart.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      indicator: indicators,
      radius: '65%',
      axisName: { color: '#6b7686', fontSize: 12 },
      splitLine: { lineStyle: { color: '#e8ecf1' } },
      splitArea: { areaStyle: { color: ['#ffffff', '#fafbfc'] } },
      axisLine: { lineStyle: { color: '#e8ecf1' } }
    },
    series: [{
      type: 'radar',
      symbolSize: 5,
      data: [{
        value: values,
        name: '课堂表现',
        areaStyle: { color: 'rgba(47,125,110,0.25)' },
        lineStyle: { color: '#2f7d6e', width: 2 },
        itemStyle: { color: '#2f7d6e' }
      }]
    }],
    graphic: hasData ? [] : [{
      type: 'text',
      left: 'center',
      bottom: 6,
      style: { text: '暂无评分数据，教师可在右上角「编辑」录入', fill: '#6b7686', fontSize: 12 }
    }]
  }, true)
}

function handleResize() { chart && chart.resize() }

onMounted(() => {
  chart = echarts.init(el.value)
  render()
  window.addEventListener('resize', handleResize)
})

// 保存后父组件会重新拉取学生数据，behavior 变化时同步刷新图表
watch(() => props.behavior, () => render(), { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart && chart.dispose()
})
</script>
