<template>
  <UDashboardPanel id="nutrition">
    <template #header>
      <UDashboardNavbar title="Nutrition">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <button
            @click="analyzeAllNutrition"
            :disabled="analyzingNutrition"
            class="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <span v-if="analyzingNutrition">Analyzing...</span>
            <span v-else>Analyze All</span>
          </button>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {{ totalNutrition }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Days</div>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                {{ analyzedNutrition }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Analyzed</div>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {{ avgScore !== null ? avgScore.toFixed(1) : '-' }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Score</div>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {{ avgCalories ? Math.round(avgCalories) : '-' }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Calories</div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Calorie Tracking Chart -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Calorie Tracking</h3>
            <ClientOnly>
              <Line :data="calorieTrackingData" :options="lineChartOptions" />
            </ClientOnly>
          </div>
          
          <!-- Macro Distribution Chart -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Macro Distribution</h3>
            <ClientOnly>
              <Doughnut :data="macroDistributionData" :options="doughnutChartOptions" />
            </ClientOnly>
          </div>
          
          <!-- Nutrition Scores Chart -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nutrition Scores</h3>
            <ClientOnly>
              <Line :data="nutritionScoresData" :options="lineChartOptions" />
            </ClientOnly>
          </div>
          
          <!-- Hydration Chart -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hydration Tracking</h3>
            <ClientOnly>
              <Bar :data="hydrationData" :options="barChartOptions" />
            </ClientOnly>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Analysis Status
              </label>
              <USelect
                v-model="filterAnalysis"
                :items="analysisStatusOptions"
                placeholder="All Status"
                class="w-full"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Calorie Goal Status
              </label>
              <USelect
                v-model="filterCalories"
                :items="calorieStatusOptions"
                placeholder="All"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- Nutrition Table -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div v-if="loading" class="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading nutrition data...
          </div>
          
          <div v-else-if="filteredNutrition.length === 0" class="p-8 text-center text-gray-600 dark:text-gray-400">
            No nutrition data found. Connect Yazio and sync data to get started.
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Calories
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Protein
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Carbs
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fat
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Water
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    AI Analysis
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="nutrition in paginatedNutrition"
                  :key="nutrition.id"
                  @click="navigateToNutrition(nutrition.id)"
                  class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ formatDate(nutrition.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <span v-if="nutrition.calories">
                      {{ nutrition.calories }}
                      <span v-if="nutrition.caloriesGoal" class="text-xs text-gray-500">
                        / {{ nutrition.caloriesGoal }} kcal
                      </span>
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ nutrition.protein ? Math.round(nutrition.protein) + 'g' : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ nutrition.carbs ? Math.round(nutrition.carbs) + 'g' : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ nutrition.fat ? Math.round(nutrition.fat) + 'g' : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {{ nutrition.waterMl ? (nutrition.waterMl / 1000).toFixed(1) + 'L' : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span v-if="(nutrition as any).overallScore" :class="getScoreBadgeClass((nutrition as any).overallScore)">
                      {{ (nutrition as any).overallScore }}/10
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span :class="getAnalysisStatusBadgeClass((nutrition as any).aiAnalysisStatus)">
                      {{ getAnalysisStatusLabel((nutrition as any).aiAnalysisStatus) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredNutrition.length) }} of {{ filteredNutrition.length }} entries
              </div>
              <div class="flex gap-2">
                <button
                  @click="changePage(currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <div class="flex gap-1">
                  <button
                    v-for="page in visiblePages"
                    :key="page"
                    @click="changePage(page)"
                    :class="[
                      'px-3 py-1 rounded text-sm',
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    ]"
                  >
                    {{ page }}
                  </button>
                </div>
                <button
                  @click="changePage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Doughnut, Bar } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const colorMode = useColorMode()
const toast = useToast()
const loading = ref(true)
const analyzingNutrition = ref(false)
const allNutrition = ref<any[]>([])
const currentPage = ref(1)
const itemsPerPage = 20

// Filters
const filterAnalysis = ref<string | undefined>(undefined)
const filterCalories = ref<string | undefined>(undefined)

// Filter options
const analysisStatusOptions = [
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Not Started', value: 'NOT_STARTED' }
]

const calorieStatusOptions = [
  { label: 'Over Goal', value: 'over' },
  { label: 'Under Goal', value: 'under' },
  { label: 'Met Goal (±50 cal)', value: 'met' }
]

// Fetch all nutrition data
async function fetchNutrition() {
  loading.value = true
  try {
    const response: any = await $fetch('/api/nutrition')
    allNutrition.value = response.nutrition || []
  } catch (error) {
    console.error('Error fetching nutrition:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load nutrition data',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Computed properties
const filteredNutrition = computed(() => {
  let nutrition = [...allNutrition.value]
  
  if (filterAnalysis.value) {
    if (filterAnalysis.value === 'NOT_STARTED') {
      nutrition = nutrition.filter(n => !(n as any).aiAnalysisStatus)
    } else {
      nutrition = nutrition.filter(n => (n as any).aiAnalysisStatus === filterAnalysis.value)
    }
  }
  
  if (filterCalories.value) {
    nutrition = nutrition.filter(n => {
      if (!n.calories || !n.caloriesGoal) return false
      const diff = n.calories - n.caloriesGoal
      if (filterCalories.value === 'over') return diff > 50
      if (filterCalories.value === 'under') return diff < -50
      if (filterCalories.value === 'met') return Math.abs(diff) <= 50
      return true
    })
  }
  
  return nutrition
})

const totalNutrition = computed(() => allNutrition.value.length)
const analyzedNutrition = computed(() => 
  allNutrition.value.filter(n => (n as any).aiAnalysisStatus === 'COMPLETED').length
)
const avgScore = computed(() => {
  const withScores = allNutrition.value.filter(n => (n as any).overallScore)
  if (withScores.length === 0) return null
  return withScores.reduce((sum, n) => sum + (n as any).overallScore, 0) / withScores.length
})
const avgCalories = computed(() => {
  const withCalories = allNutrition.value.filter(n => n.calories)
  if (withCalories.length === 0) return null
  return withCalories.reduce((sum, n) => sum + n.calories, 0) / withCalories.length
})

const totalPages = computed(() => Math.ceil(filteredNutrition.value.length / itemsPerPage))
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 7
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const paginatedNutrition = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredNutrition.value.slice(start, end)
})

// Functions
function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getScoreBadgeClass(score: number) {
  const baseClass = 'px-2 py-1 rounded text-xs font-semibold'
  if (score >= 8) return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
  if (score >= 6) return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
  if (score >= 4) return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
  return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
}

function getAnalysisStatusBadgeClass(status: string | null | undefined) {
  const baseClass = 'px-2 py-1 rounded text-xs font-medium'
  if (status === 'COMPLETED') return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
  if (status === 'PROCESSING') return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
  if (status === 'PENDING') return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
  if (status === 'FAILED') return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
  return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`
}

function getAnalysisStatusLabel(status: string | null | undefined) {
  if (status === 'COMPLETED') return '✓ Complete'
  if (status === 'PROCESSING') return '⟳ Processing'
  if (status === 'PENDING') return '⋯ Pending'
  if (status === 'FAILED') return '✗ Failed'
  return '− Not Started'
}

function navigateToNutrition(id: string) {
  navigateTo(`/nutrition/${id}`)
}

function changePage(page: number) {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function analyzeAllNutrition() {
  analyzingNutrition.value = true
  try {
    const response: any = await $fetch('/api/nutrition/analyze-all', {
      method: 'POST'
    })
    
    toast.add({
      title: 'Analysis Started',
      description: response.message,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    
    // Refresh the nutrition list after a short delay
    setTimeout(async () => {
      await fetchNutrition()
    }, 2000)
  } catch (error: any) {
    toast.add({
      title: 'Analysis Failed',
      description: error.data?.message || error.message || 'Failed to start analysis',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    analyzingNutrition.value = false
  }
}

// Chart data computed properties
const calorieTrackingData = computed(() => {
  const last30Days = allNutrition.value
    .filter(n => n.calories)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
  
  return {
    labels: last30Days.map(n => formatDate(n.date)),
    datasets: [
      {
        label: 'Calories Consumed',
        data: last30Days.map(n => n.calories),
        borderColor: colorMode.value === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)',
        backgroundColor: colorMode.value === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Calorie Goal',
        data: last30Days.map(n => n.caloriesGoal || 0),
        borderColor: colorMode.value === 'dark' ? 'rgb(251, 146, 60)' : 'rgb(249, 115, 22)',
        backgroundColor: colorMode.value === 'dark' ? 'rgba(251, 146, 60, 0.1)' : 'rgba(249, 115, 22, 0.1)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4
      }
    ]
  }
})

const macroDistributionData = computed(() => {
  const withMacros = allNutrition.value.filter(n => n.protein && n.carbs && n.fat)
  if (withMacros.length === 0) {
    return {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: []
      }]
    }
  }
  
  const avgProtein = withMacros.reduce((sum, n) => sum + n.protein, 0) / withMacros.length
  const avgCarbs = withMacros.reduce((sum, n) => sum + n.carbs, 0) / withMacros.length
  const avgFat = withMacros.reduce((sum, n) => sum + n.fat, 0) / withMacros.length
  
  return {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: [Math.round(avgProtein), Math.round(avgCarbs), Math.round(avgFat)],
      backgroundColor: [
        colorMode.value === 'dark' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(22, 163, 74, 0.8)',
        colorMode.value === 'dark' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)',
        colorMode.value === 'dark' ? 'rgba(251, 146, 60, 0.8)' : 'rgba(249, 115, 22, 0.8)'
      ],
      borderColor: [
        colorMode.value === 'dark' ? 'rgb(34, 197, 94)' : 'rgb(22, 163, 74)',
        colorMode.value === 'dark' ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)',
        colorMode.value === 'dark' ? 'rgb(251, 146, 60)' : 'rgb(249, 115, 22)'
      ],
      borderWidth: 2
    }]
  }
})

const nutritionScoresData = computed(() => {
  const withScores = allNutrition.value
    .filter(n => (n as any).overallScore)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
  
  return {
    labels: withScores.map(n => formatDate(n.date)),
    datasets: [{
      label: 'Nutrition Score',
      data: withScores.map(n => (n as any).overallScore),
      borderColor: colorMode.value === 'dark' ? 'rgb(168, 85, 247)' : 'rgb(147, 51, 234)',
      backgroundColor: colorMode.value === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(147, 51, 234, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }
})

const hydrationData = computed(() => {
  const withWater = allNutrition.value
    .filter(n => n.waterMl)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
  
  return {
    labels: withWater.map(n => formatDate(n.date)),
    datasets: [{
      label: 'Water (Liters)',
      data: withWater.map(n => parseFloat((n.waterMl / 1000).toFixed(1))),
      backgroundColor: colorMode.value === 'dark' ? 'rgba(56, 189, 248, 0.8)' : 'rgba(14, 165, 233, 0.8)',
      borderColor: colorMode.value === 'dark' ? 'rgb(56, 189, 248)' : 'rgb(14, 165, 233)',
      borderWidth: 2
    }]
  }
})

// Chart options
const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2,
  plugins: {
    legend: {
      labels: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#4b5563'
      }
    },
    tooltip: {
      backgroundColor: colorMode.value === 'dark' ? '#1f2937' : '#ffffff',
      titleColor: colorMode.value === 'dark' ? '#f3f4f6' : '#111827',
      bodyColor: colorMode.value === 'dark' ? '#d1d5db' : '#374151',
      borderColor: colorMode.value === 'dark' ? '#374151' : '#e5e7eb',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#6b7280',
        maxRotation: 45,
        minRotation: 45
      },
      grid: {
        color: colorMode.value === 'dark' ? '#374151' : '#e5e7eb'
      }
    },
    y: {
      ticks: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#6b7280'
      },
      grid: {
        color: colorMode.value === 'dark' ? '#374151' : '#e5e7eb'
      }
    }
  }
}))

const doughnutChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#4b5563',
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: colorMode.value === 'dark' ? '#1f2937' : '#ffffff',
      titleColor: colorMode.value === 'dark' ? '#f3f4f6' : '#111827',
      bodyColor: colorMode.value === 'dark' ? '#d1d5db' : '#374151',
      borderColor: colorMode.value === 'dark' ? '#374151' : '#e5e7eb',
      borderWidth: 1,
      callbacks: {
        label: function(context: any) {
          const label = context.label || ''
          const value = context.parsed || 0
          return `${label}: ${value}g`
        }
      }
    }
  }
}))

const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2,
  plugins: {
    legend: {
      labels: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#4b5563'
      }
    },
    tooltip: {
      backgroundColor: colorMode.value === 'dark' ? '#1f2937' : '#ffffff',
      titleColor: colorMode.value === 'dark' ? '#f3f4f6' : '#111827',
      bodyColor: colorMode.value === 'dark' ? '#d1d5db' : '#374151',
      borderColor: colorMode.value === 'dark' ? '#374151' : '#e5e7eb',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#6b7280',
        maxRotation: 45,
        minRotation: 45
      },
      grid: {
        color: colorMode.value === 'dark' ? '#374151' : '#e5e7eb'
      }
    },
    y: {
      ticks: {
        color: colorMode.value === 'dark' ? '#9ca3af' : '#6b7280'
      },
      grid: {
        color: colorMode.value === 'dark' ? '#374151' : '#e5e7eb'
      }
    }
  }
}))

// Watch filters and reset to page 1
watch([filterAnalysis, filterCalories], () => {
  currentPage.value = 1
})

// Load data on mount
onMounted(() => {
  fetchNutrition()
})
</script>