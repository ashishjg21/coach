<template>
  <UDashboardPanel id="report-detail">
    <template #header>
      <UDashboardNavbar :title="reportTitle || 'Report'">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            to="/reports"
          >
            Back to Reports
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-4xl mx-auto">
        <div v-if="pending" class="flex justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>
      
      <div v-else-if="report">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-3xl font-bold">{{ reportTitle }}</h2>
              <p class="text-gray-600 dark:text-gray-400 mt-2">
                {{ formatDateRange(report.dateRangeStart, report.dateRangeEnd) }}
              </p>
            </div>
            <UBadge :color="statusColor as any" size="lg">
              {{ report.status }}
            </UBadge>
          </div>
        </div>
        
        <!-- Status Alert -->
        <UAlert
          v-if="report.status === 'PROCESSING'"
          color="info"
          icon="i-heroicons-arrow-path"
          title="Generating Report"
          description="Your AI coach is analyzing your training data. This may take a few moments..."
          class="mb-6"
        />
        
        <UAlert
          v-else-if="report.status === 'FAILED'"
          color="error"
          icon="i-heroicons-exclamation-triangle"
          title="Report Generation Failed"
          description="Unable to generate report. Please try again."
          class="mb-6"
        />
        
        <!-- Content - Structured JSON Display -->
        <div v-if="report.status === 'COMPLETED' && report.analysisJson" class="space-y-6">
          <!-- Quick Take / Executive Summary -->
          <UCard>
            <template #header>
              <h3 class="text-xl font-semibold">Quick Take</h3>
            </template>
            <p class="text-gray-700 dark:text-gray-300 leading-relaxed">{{ report.analysisJson.executive_summary }}</p>
          </UCard>

          <!-- Analysis Sections -->
          <UCard v-for="section in report.analysisJson.sections" :key="section.title">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-semibold">{{ section.title }}</h3>
                <UBadge :color="getStatusBadgeColor(section.status) as any" size="lg">
                  {{ section.status_label }}
                </UBadge>
              </div>
            </template>
            
            <div class="space-y-3">
              <div v-for="(point, idx) in section.analysis_points" :key="idx" class="flex gap-3">
                <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p class="text-gray-700 dark:text-gray-300">{{ point }}</p>
              </div>
            </div>
          </UCard>

          <!-- Recommendations -->
          <UCard v-if="report.analysisJson.recommendations?.length">
            <template #header>
              <h3 class="text-xl font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-light-bulb" class="w-6 h-6" />
                Recommendations
              </h3>
            </template>
            
            <div class="space-y-4">
              <div
                v-for="rec in report.analysisJson.recommendations"
                :key="rec.title"
                class="border-l-4 pl-4"
                :class="getPriorityBorderClass(rec.priority)"
              >
                <div class="flex items-start justify-between gap-4 mb-2">
                  <h4 class="font-semibold text-lg">{{ rec.title }}</h4>
                  <UBadge :color="getPriorityBadgeColor(rec.priority) as any">
                    {{ rec.priority }} priority
                  </UBadge>
                </div>
                <p class="text-gray-700 dark:text-gray-300">{{ rec.description }}</p>
              </div>
            </div>
          </UCard>

          <!-- Metrics Summary -->
          <UCard v-if="report.analysisJson.metrics_summary">
            <template #header>
              <h3 class="text-xl font-semibold">Metrics Summary</h3>
            </template>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div v-if="report.analysisJson.metrics_summary.total_duration_minutes" class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold text-primary">
                  {{ Math.round(report.analysisJson.metrics_summary.total_duration_minutes) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Minutes</div>
              </div>
              
              <div v-if="report.analysisJson.metrics_summary.total_tss" class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold text-primary">
                  {{ Math.round(report.analysisJson.metrics_summary.total_tss) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total TSS</div>
              </div>
              
              <div v-if="report.analysisJson.metrics_summary.avg_power" class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold text-primary">
                  {{ Math.round(report.analysisJson.metrics_summary.avg_power) }}W
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Power</div>
              </div>
              
              <div v-if="report.analysisJson.metrics_summary.avg_heart_rate" class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold text-primary">
                  {{ Math.round(report.analysisJson.metrics_summary.avg_heart_rate) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg HR</div>
              </div>
              
              <div v-if="report.analysisJson.metrics_summary.total_distance_km" class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold text-primary">
                  {{ report.analysisJson.metrics_summary.total_distance_km.toFixed(1) }}km
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Distance</div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Content - Markdown Fallback -->
        <UCard v-else-if="report.status === 'COMPLETED' && report.markdown" class="prose prose-lg max-w-none">
          <MDC :value="report.markdown" />
        </UCard>
        
        <!-- Suggestions (for daily coach) -->
        <UCard v-if="report.suggestions" class="mt-6">
          <template #header>
            <h3 class="text-xl font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-light-bulb" class="w-6 h-6" />
              Today's Coaching Suggestion
            </h3>
          </template>
          
          <div class="space-y-4">
            <div>
              <p class="text-lg font-semibold mb-2">{{ getActionText(report.suggestions.action) }}</p>
              <p class="text-gray-700 dark:text-gray-300">{{ report.suggestions.reason }}</p>
            </div>
            
            <div v-if="report.suggestions.modification" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Recommended Modification:</p>
              <p class="text-blue-800 dark:text-blue-300">{{ report.suggestions.modification }}</p>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Confidence: {{ (report.suggestions.confidence * 100).toFixed(0) }}%</span>
              <span>Model: {{ report.modelVersion }}</span>
            </div>
          </div>
        </UCard>
        
        <!-- Actions -->
        <div class="mt-6 flex gap-4">
          <UButton
            color="neutral"
            variant="outline"
            @click="handlePrint"
          >
            <UIcon name="i-heroicons-printer" class="w-4 h-4 mr-2" />
            Print / Save as PDF
          </UButton>
          
          <UButton
            v-if="report.status === 'COMPLETED'"
            color="neutral"
            variant="outline"
            disabled
          >
            <UIcon name="i-heroicons-share" class="w-4 h-4 mr-2" />
            Share (Coming Soon)
          </UButton>
        </div>
      </div>
      
      <div v-else class="text-center py-20">
        <p class="text-gray-600 dark:text-gray-400">Report not found</p>
        <UButton to="/reports" class="mt-4">
          Back to Reports
        </UButton>
      </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const route = useRoute()
const { signOut } = useAuth()
const reportId = route.params.id as string

const { data: report, pending } = await useFetch(`/api/reports/${reportId}`, {
  // Refresh every 5 seconds if report is still processing
  watch: false,
})

// Poll for updates if report is processing
if (report.value?.status === 'PROCESSING') {
  const interval = setInterval(async () => {
    const { data } = await useFetch(`/api/reports/${reportId}`)
    if (data.value) {
      report.value = data.value
      if (data.value.status !== 'PROCESSING') {
        clearInterval(interval)
      }
    }
  }, 5000)
  
  onUnmounted(() => clearInterval(interval))
}

definePageMeta({
  middleware: 'auth'
})

const reportTitle = computed(() => {
  if (!report.value) return ''
  const titles: Record<string, string> = {
    'WEEKLY_ANALYSIS': 'Weekly Training Analysis',
    'LAST_3_WORKOUTS': 'Last 3 Workouts Analysis',
    'RACE_PREP': 'Race Preparation Report',
    'DAILY_SUGGESTION': 'Daily Coaching Brief',
    'CUSTOM': 'Custom Report'
  }
  return titles[report.value.type] || 'Report'
})

const statusColor = computed(() => {
  if (!report.value) return 'neutral'
  const colors: Record<string, string> = {
    'PENDING': 'warning',
    'PROCESSING': 'info',
    'COMPLETED': 'success',
    'FAILED': 'error'
  }
  return colors[report.value.status] || 'neutral'
})

const getStatusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    'excellent': 'success',
    'good': 'info',
    'moderate': 'warning',
    'needs_improvement': 'warning',
    'poor': 'error'
  }
  return colors[status] || 'neutral'
}

const getPriorityBadgeColor = (priority: string) => {
  const colors: Record<string, string> = {
    'high': 'error',
    'medium': 'warning',
    'low': 'success'
  }
  return colors[priority] || 'neutral'
}

const getPriorityBorderClass = (priority: string) => {
  const classes: Record<string, string> = {
    'high': 'border-red-500',
    'medium': 'border-yellow-500',
    'low': 'border-green-500'
  }
  return classes[priority] || 'border-gray-300'
}

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endDate = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startDate} - ${endDate}`
}

const getActionText = (action: string) => {
  const texts: Record<string, string> = {
    'proceed': '✅ Proceed as Planned',
    'modify': '🔄 Modify Workout',
    'reduce_intensity': '📉 Reduce Intensity',
    'rest': '🛌 Rest Day Recommended'
  }
  return texts[action] || action
}

const handlePrint = () => {
  window.print()
}
</script>

<style scoped>
/* Print styles */
@media print {
  nav, .actions {
    display: none;
  }
}
</style>