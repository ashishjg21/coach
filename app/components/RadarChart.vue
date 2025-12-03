<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
    <div v-if="!hasScores" class="text-center py-12 text-gray-500">
      No score data available
    </div>
    
    <div v-else class="flex justify-center">
      <svg :viewBox="`0 0 ${size} ${size}`" class="w-full max-w-md">
        <!-- Grid circles -->
        <g v-for="i in 5" :key="`grid-${i}`">
          <circle
            :cx="center"
            :cy="center"
            :r="(radius / 5) * i"
            fill="none"
            stroke="currentColor"
            :stroke-opacity="0.1"
            class="text-gray-400"
          />
          <text
            :x="center + 5"
            :y="center - (radius / 5) * i + 4"
            class="text-gray-400 dark:text-gray-500"
            style="font-size: 10px"
          >
            {{ i * 2 }}
          </text>
        </g>
        
        <!-- Axis lines -->
        <g v-for="(point, idx) in points" :key="`axis-${idx}`">
          <line
            :x1="center"
            :y1="center"
            :x2="point.axisX"
            :y2="point.axisY"
            stroke="currentColor"
            :stroke-opacity="0.2"
            class="text-gray-400"
          />
        </g>
        
        <!-- Data polygon -->
        <polygon
          :points="polygonPoints"
          :fill="fillColor"
          fill-opacity="0.3"
          :stroke="strokeColor"
          stroke-width="2"
        />
        
        <!-- Data points -->
        <g v-for="(point, idx) in points" :key="`point-${idx}`">
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4"
            :fill="strokeColor"
            class="hover:r-6 transition-all cursor-pointer"
          >
            <title>{{ point.label }}: {{ point.value }}/10</title>
          </circle>
        </g>
        
        <!-- Labels -->
        <g v-for="(point, idx) in points" :key="`label-${idx}`">
          <text
            :x="point.labelX"
            :y="point.labelY"
            :text-anchor="point.textAnchor"
            class="text-gray-700 dark:text-gray-300 font-medium"
            style="font-size: 12px"
          >
            {{ point.label }}
          </text>
          <text
            :x="point.labelX"
            :y="point.labelY + 14"
            :text-anchor="point.textAnchor"
            class="text-gray-500 dark:text-gray-400"
            style="font-size: 10px"
          >
            {{ point.value }}/10
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  scores: Record<string, number | null | undefined>
  type: 'workout' | 'nutrition'
}>()

const size = 400
const center = size / 2
const radius = 140
const labelOffset = 60

const labels = computed(() => {
  if (props.type === 'workout') {
    return {
      overall: 'Overall',
      technical: 'Technical',
      effort: 'Effort',
      pacing: 'Pacing',
      execution: 'Execution'
    }
  } else {
    return {
      overall: 'Overall',
      macroBalance: 'Macro Balance',
      quality: 'Quality',
      adherence: 'Adherence',
      hydration: 'Hydration'
    }
  }
})

const fillColor = computed(() => props.type === 'workout' ? '#3b82f680' : '#22c55e80')
const strokeColor = computed(() => props.type === 'workout' ? '#3b82f6' : '#22c55e')

const hasScores = computed(() => {
  return Object.values(props.scores).some(score => score != null && score !== undefined)
})

const points = computed(() => {
  const scoreKeys = Object.keys(labels.value)
  const angleStep = (2 * Math.PI) / scoreKeys.length
  
  return scoreKeys.map((key, idx) => {
    const angle = idx * angleStep - Math.PI / 2 // Start from top
    const value = props.scores[key] || 0
    const r = (value / 10) * radius
    
    // Data point position
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    
    // Axis end position (for grid lines)
    const axisX = center + radius * Math.cos(angle)
    const axisY = center + radius * Math.sin(angle)
    
    // Label position (outside the chart)
    const labelR = radius + labelOffset
    const labelX = center + labelR * Math.cos(angle)
    const labelY = center + labelR * Math.sin(angle)
    
    // Text anchor based on position
    let textAnchor = 'middle'
    if (labelX < center - 10) textAnchor = 'end'
    else if (labelX > center + 10) textAnchor = 'start'
    
    return {
      x,
      y,
      axisX,
      axisY,
      labelX,
      labelY,
      textAnchor,
      label: labels.value[key as keyof typeof labels.value],
      value: value.toFixed(1)
    }
  })
})

const polygonPoints = computed(() => {
  return points.value.map(p => `${p.x},${p.y}`).join(' ')
})
</script>