<template>
  <div ref="el" class="chart"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({ behavior: { type: Object, required: true } })
const el = ref(null)
let chart = null

onMounted(() => {
  chart = echarts.init(el.value)
  const indicators = Object.keys(props.behavior).map(k => ({ name: k, max: 5 }))
  const values = Object.values(props.behavior)
  chart.setOption({
    tooltip: {},
    radar: {
      indicator: indicators,
      radius: '65%'
    },
    series: [{
      type: 'radar',
      data: [{ value: values, name: '课堂表现' }],
      areaStyle: { color: 'rgba(47,125,110,0.25)' },
      lineStyle: { color: '#2f7d6e' },
      itemStyle: { color: '#2f7d6e' }
    }]
  })
  window.addEventListener('resize', () => chart && chart.resize())
})

onBeforeUnmount(() => { chart && chart.dispose() })
</script>
