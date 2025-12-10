<template>
  <div class="power-curve-chart">
    <div v-if="loading" class="flex justify-center items-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>
    
    <div v-else-if="!powerData?.hasPowerData" class="text-center py-12">
      <UIcon name="i-heroicons-bolt-slash" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p class="text-gray-600 dark:text-gray-400">{{ powerData?.message || 'No power data available for this workout' }}</p>
    </div>

    <div v-else-if="powerData" class="space-y-6">
      <!-- Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 rounded-lg p-4 shadow">
          <div class="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">Peak 5s</div>
          <div class="text-2xl font-bold text-red-900 dark:text-red-100">{{ powerData.summary.peak5s }}</div>
          <div class="text-xs text-red-700 dark:text-red-300 mt-1">watts</div>
        </div>

        <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 rounded-lg p-4 shadow">
          <div class="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1">Peak 1min</div>
          <div class="text-2xl font-bold text-orange-900 dark:text-orange-100">{{ powerData.summary.peak1min }}</div>
          <div class="text-xs text-orange-700 dark:text-orange-300 mt-1">watts</div>
        </div>

        <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 rounded-lg p-4 shadow">
          <div class="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mb-1">Peak 5min</div>
          <div class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{{ powerData.summary.peak5min }}</div>
          <div class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">watts</div>
        </div>

        <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-lg p-4 shadow">
          <div class="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Peak 20min</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-100">{{ powerData.summary.peak20min }}</div>
          <div class="text-xs text-green-700 dark:text-green-300 mt-1">watts</div>
        </div>

        <div v-if="powerData.summary.estimatedFTP" class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-4 shadow">
          <div class="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Est. FTP</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ powerData.summary.estimatedFTP }}</div>
          <div class="text-xs text-blue-700 dark:text-blue-300 mt-1">watts</div>
        </div>
      </div>

      <!-- Chart -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Power Duration Curve</h3>
        <div style="height: 300px;">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Info Section -->
      <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Understanding Power Curve</h4>
        <p class="text-xs text-blue-800 dark:text-blue-200 mb-2">
          Your power curve shows the maximum average power you can sustain for different durations during this workout.
        </p>
        <ul class="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li><strong>5s-1min:</strong> Anaerobic power & sprint capability</li>
          <li><strong>5min:</strong> VO2 max power output</li>
          <li><strong>20min:</strong> Used to estimate FTP (95% of 20min power)</li>
          <li v-if="powerData.summary.currentFTP"><strong>Your FTP:</strong> {{ powerData.summary.currentFTP }}W</li>
        </ul>
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
  workoutId: string
}>()

const loading = ref(true)
const powerData = ref<any>(null)

// Fetch power curve data
async function fetchPowerCurve() {
  loading.value = true
  
  try {
    const data = await $fetch(`/api/workouts/${props.workoutId}/power-curve`)
    powerData.value = data
  } catch (e: any) {
    console.error('Error fetching power curve:', e)
    powerData.value = {
      hasPowerData: false,
      message: e.data?.message || e.message || 'Failed to load power curve data'
    }
  } finally {
    loading.value = false
  }
}

// Chart data computed property
const chartData = computed(() => {
  if (!powerData.value?.powerCurve) return { labels: [], datasets: [] }
  
  const curve = powerData.value.powerCurve
  const labels = curve.map((point: any) => point.durationLabel)
  const powers = curve.map((point: any) => point.power)
  
  return {
    labels,
    datasets: [
      {
        label: 'Max Power (W)',
        data: powers,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true
      }
    ]
  }
})

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          return `${context.parsed.y}W`
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: 'Duration',
        color: 'rgb(107, 114, 128)'
      },
      grid: {
        display: false
      },
      ticks: {
        color: 'rgb(107, 114, 128)'
      }
    },
    y: {
      display: true,
      title: {
        display: true,
        text: 'Power (watts)',
        color: 'rgb(107, 114, 128)'
      },
      grid: {
        color: 'rgba(128, 128, 128, 0.1)'
      },
      ticks: {
        color: 'rgb(107, 114, 128)'
      },
      beginAtZero: false
    }
  }
}

// Load data on mount
onMounted(() => {
  fetchPowerCurve()
})
</script>

<style scoped>
.power-curve-chart {
  width: 100%;
}
</style>