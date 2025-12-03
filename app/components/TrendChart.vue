<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
    <div v-if="!data || data.length === 0" class="text-center py-12 text-gray-500">
      No score data available for this period
    </div>
    
    <div v-else class="space-y-4">
      <!-- Legend -->
      <div class="flex flex-wrap gap-4 justify-center text-sm">
        <div v-for="metric in visibleMetrics" :key="metric.key" class="flex items-center gap-2">
          <div :class="['w-3 h-3 rounded-full', metric.color]"></div>
          <span class="text-gray-700 dark:text-gray-300">{{ metric.label }}</span>
        </div>
      </div>
      
      <!-- Chart -->
      <div class="relative" style="height: 300px;">
        <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-full">
          <!-- Grid lines -->
          <g v-for="i in 5" :key="`grid-${i}`">
            <line
              :x1="padding"
              :y1="padding + (i * gridSpacing)"
              :x2="width - padding"
              :y2="padding + (i * gridSpacing)"
              stroke="currentColor"
              :stroke-opacity="0.1"
              class="text-gray-400"
            />
            <text
              :x="padding - 10"
              :y="padding + (i * gridSpacing) + 4"
              text-anchor="end"
              class="text-gray-500 dark:text-gray-400"
              style="font-size: 10px"
            >
              {{ 10 - (i * 2) }}
            </text>
          </g>
          
          <!-- Lines -->
          <g v-for="metric in visibleMetrics" :key="`line-${metric.key}`">
            <polyline
              :points="getLinePoints(metric.key)"
              fill="none"
              :stroke="metric.strokeColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            
            <!-- Points -->
            <circle
              v-for="(point, idx) in getPoints(metric.key)"
              :key="`point-${metric.key}-${idx}`"
              :cx="point.x"
              :cy="point.y"
              r="4"
              :fill="metric.strokeColor"
              class="hover:r-6 transition-all cursor-pointer"
            >
              <title>{{ point.label }}: {{ point.value }}/10</title>
            </circle>
          </g>
          
          <!-- X-axis labels -->
          <g v-for="(point, idx) in xAxisPoints" :key="`x-label-${idx}`">
            <text
              :x="point.x"
              :y="height - padding + 20"
              text-anchor="middle"
              class="text-gray-500 dark:text-gray-400"
              style="font-size: 9px"
            >
              {{ point.label }}
            </text>
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: any[]
  type: 'workout' | 'nutrition'
}>()

const width = 800
const height = 350
const padding = 50
const gridSpacing = (height - 2 * padding) / 5

const metrics = computed(() => {
  if (props.type === 'workout') {
    return [
      { key: 'overallScore', label: 'Overall', color: 'bg-yellow-500', strokeColor: '#eab308' },
      { key: 'technicalScore', label: 'Technical', color: 'bg-blue-500', strokeColor: '#3b82f6' },
      { key: 'effortScore', label: 'Effort', color: 'bg-red-500', strokeColor: '#ef4444' },
      { key: 'pacingScore', label: 'Pacing', color: 'bg-green-500', strokeColor: '#22c55e' },
      { key: 'executionScore', label: 'Execution', color: 'bg-purple-500', strokeColor: '#a855f7' }
    ]
  } else {
    return [
      { key: 'overallScore', label: 'Overall', color: 'bg-yellow-500', strokeColor: '#eab308' },
      { key: 'macroBalanceScore', label: 'Macro Balance', color: 'bg-blue-500', strokeColor: '#3b82f6' },
      { key: 'qualityScore', label: 'Quality', color: 'bg-green-500', strokeColor: '#22c55e' },
      { key: 'adherenceScore', label: 'Adherence', color: 'bg-purple-500', strokeColor: '#a855f7' },
      { key: 'hydrationScore', label: 'Hydration', color: 'bg-cyan-500', strokeColor: '#06b6d4' }
    ]
  }
})

const visibleMetrics = computed(() => metrics.value)

const xAxisPoints = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  const chartWidth = width - 2 * padding
  const step = chartWidth / Math.max(props.data.length - 1, 1)
  
  // Show max 7 labels to avoid crowding
  const labelInterval = Math.ceil(props.data.length / 7)
  
  return props.data.map((item, idx) => ({
    x: padding + idx * step,
    label: idx % labelInterval === 0 ? formatDate(item.date) : ''
  })).filter(p => p.label)
})

const getLinePoints = (key: string) => {
  if (!props.data || props.data.length === 0) return ''
  
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding
  const step = chartWidth / Math.max(props.data.length - 1, 1)
  
  return props.data
    .map((item, idx) => {
      const value = item[key] || 0
      const x = padding + idx * step
      const y = padding + chartHeight - (value / 10) * chartHeight
      return `${x},${y}`
    })
    .join(' ')
}

const getPoints = (key: string) => {
  if (!props.data || props.data.length === 0) return []
  
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding
  const step = chartWidth / Math.max(props.data.length - 1, 1)
  
  return props.data.map((item, idx) => {
    const value = item[key] || 0
    return {
      x: padding + idx * step,
      y: padding + chartHeight - (value / 10) * chartHeight,
      value: value.toFixed(1),
      label: key.replace('Score', '').replace(/([A-Z])/g, ' $1').trim()
    }
  })
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>