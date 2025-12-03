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
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  data: any[]
  type: 'workout' | 'nutrition'
}>()

const colorMode = useColorMode()

const metrics = computed(() => {
  if (props.type === 'workout') {
    return [
      { key: 'overallScore', label: 'Overall', color: 'bg-yellow-500', strokeColor: 'rgb(234, 179, 8)' },
      { key: 'technicalScore', label: 'Technical', color: 'bg-blue-500', strokeColor: 'rgb(59, 130, 246)' },
      { key: 'effortScore', label: 'Effort', color: 'bg-red-500', strokeColor: 'rgb(239, 68, 68)' },
      { key: 'pacingScore', label: 'Pacing', color: 'bg-green-500', strokeColor: 'rgb(34, 197, 94)' },
      { key: 'executionScore', label: 'Execution', color: 'bg-purple-500', strokeColor: 'rgb(168, 85, 247)' }
    ]
  } else {
    return [
      { key: 'overallScore', label: 'Overall', color: 'bg-yellow-500', strokeColor: 'rgb(234, 179, 8)' },
      { key: 'macroBalanceScore', label: 'Macro Balance', color: 'bg-blue-500', strokeColor: 'rgb(59, 130, 246)' },
      { key: 'qualityScore', label: 'Quality', color: 'bg-green-500', strokeColor: 'rgb(34, 197, 94)' },
      { key: 'adherenceScore', label: 'Adherence', color: 'bg-purple-500', strokeColor: 'rgb(168, 85, 247)' },
      { key: 'hydrationScore', label: 'Hydration', color: 'bg-cyan-500', strokeColor: 'rgb(6, 182, 212)' }
    ]
  }
})

const visibleMetrics = computed(() => metrics.value)

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return { labels: [], datasets: [] }
  }

  const labels = props.data.map(item => formatDate(item.date))
  
  const datasets = visibleMetrics.value.map(metric => ({
    label: metric.label,
    data: props.data.map(item => item[metric.key] || 0),
    borderColor: metric.strokeColor,
    backgroundColor: metric.strokeColor.replace('rgb', 'rgba').replace(')', ', 0.1)'),
    tension: 0.4,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: metric.strokeColor,
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: metric.strokeColor,
    pointBorderWidth: 2
  }))

  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: colorMode.value === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
      titleColor: colorMode.value === 'dark' ? 'rgb(229, 231, 235)' : 'rgb(17, 24, 39)',
      bodyColor: colorMode.value === 'dark' ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)',
      borderColor: colorMode.value === 'dark' ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      callbacks: {
        label: (context: any) => {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}/10`
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)'
      },
      ticks: {
        color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        font: {
          size: 11
        },
        maxRotation: 0,
        autoSkipPadding: 20
      },
      border: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
      }
    },
    y: {
      min: 0,
      max: 10,
      ticks: {
        stepSize: 2,
        color: colorMode.value === 'dark' ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        font: {
          size: 11
        }
      },
      grid: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.5)'
      },
      border: {
        color: colorMode.value === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'
      }
    }
  }
}))
</script>