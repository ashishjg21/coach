<template>
  <UModal 
    v-model:open="isOpen"
    :title="title"
    :description="`Score: ${displayScore}/10 - ${scoreLabel}`"
    scrollable
    :ui="{ 
      footer: 'justify-end'
    }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Score Display -->
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <div :class="['text-5xl font-bold', scoreColorClass]">
              {{ displayScore }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 text-center">
              / 10
            </div>
          </div>
          
          <div class="flex-1">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div 
                :class="['h-4 rounded-full transition-all duration-300', scoreBarClass]"
                :style="{ width: `${(score || 0) * 10}%` }"
              ></div>
            </div>
            <p class="mt-2 text-sm font-medium" :class="scoreColorClass">
              {{ scoreLabel }}
            </p>
          </div>
        </div>

        <!-- Structured Analysis -->
        <div v-if="analysisData" class="space-y-6">
          <!-- Executive Summary -->
          <div v-if="analysisData.executive_summary" class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Summary
            </h4>
            <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
              {{ analysisData.executive_summary }}
            </p>
          </div>

          <!-- Analysis Sections -->
          <div v-if="analysisData.sections && analysisData.sections.length > 0" class="space-y-4">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Analysis
            </h4>
            <div v-for="(section, idx) in analysisData.sections" :key="idx" class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ section.title }}</span>
                <UBadge 
                  :color="getStatusColor(section.status)" 
                  variant="subtle"
                  size="xs"
                >
                  {{ getStatusLabel(section.status) }}
                </UBadge>
              </div>
              <ul class="space-y-1 ml-4">
                <li 
                  v-for="(point, pIdx) in section.analysis_points" 
                  :key="pIdx"
                  class="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                >
                  <span class="text-gray-400 dark:text-gray-500 mt-1">•</span>
                  <span>{{ point }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Recommendations -->
          <div v-if="analysisData.recommendations && analysisData.recommendations.length > 0" class="space-y-3">
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Recommendations
            </h4>
            <ul class="space-y-3">
              <li 
                v-for="(rec, idx) in analysisData.recommendations" 
                :key="idx"
                class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <UIcon 
                  :name="getPriorityIcon(rec.priority)" 
                  :class="['w-5 h-5 flex-shrink-0 mt-0.5', getPriorityColor(rec.priority)]" 
                />
                <div class="flex-1 space-y-1">
                  <div class="font-medium text-gray-900 dark:text-white">{{ rec.title }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">{{ rec.description }}</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Fallback: Plain text explanation -->
        <div v-else-if="explanation" class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Analysis
          </h4>
          <div class="prose prose-sm dark:prose-invert max-w-none">
            <p class="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {{ explanation }}
            </p>
          </div>
        </div>

        <!-- Improvement Actions (parsed from plain text explanation) -->
        <div v-if="!analysisData && improvementActions.length > 0" class="space-y-3">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            How to Improve
          </h4>
          <ul class="space-y-2">
            <li 
              v-for="(action, index) in improvementActions" 
              :key="index"
              class="flex items-start gap-2"
            >
              <UIcon 
                name="i-heroicons-check-circle" 
                class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" 
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ action }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="solid" @click="close">
        Close
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface AnalysisData {
  executive_summary?: string
  sections?: Array<{
    title: string
    status: string
    analysis_points: string[]
  }>
  recommendations?: Array<{
    title: string
    description: string
    priority: string
  }>
}

const props = defineProps<{
  modelValue: boolean
  title: string
  score?: number | null
  explanation?: string | null
  analysisData?: AnalysisData | null
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const displayScore = computed(() => {
  if (props.score === null || props.score === undefined) return '--'
  return props.score.toFixed(1)
})

const scoreColorClass = computed(() => {
  if (!props.score) return 'text-gray-400'
  if (props.score >= 9) return 'text-green-600 dark:text-green-400'
  if (props.score >= 7) return 'text-blue-600 dark:text-blue-400'
  if (props.score >= 5) return 'text-yellow-600 dark:text-yellow-400'
  if (props.score >= 3) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
})

const scoreBarClass = computed(() => {
  if (!props.score) return 'bg-gray-400'
  if (props.score >= 9) return 'bg-green-500'
  if (props.score >= 7) return 'bg-blue-500'
  if (props.score >= 5) return 'bg-yellow-500'
  if (props.score >= 3) return 'bg-orange-500'
  return 'bg-red-500'
})

const scoreLabel = computed(() => {
  if (!props.score) return 'No data'
  if (props.score >= 9) return 'Exceptional'
  if (props.score >= 7) return 'Strong'
  if (props.score >= 5) return 'Adequate'
  if (props.score >= 3) return 'Needs Work'
  return 'Poor'
})

// Status helpers
const getStatusColor = (status: string): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' => {
  const map: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'> = {
    excellent: 'success',
    good: 'primary',
    moderate: 'warning',
    needs_improvement: 'error'
  }
  return map[status] || 'neutral'
}

const getStatusLabel = (status: string) => {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Priority helpers
const getPriorityIcon = (priority: string) => {
  const map: Record<string, string> = {
    high: 'i-heroicons-exclamation-circle',
    medium: 'i-heroicons-information-circle',
    low: 'i-heroicons-light-bulb'
  }
  return map[priority] || 'i-heroicons-information-circle'
}

const getPriorityColor = (priority: string) => {
  const map: Record<string, string> = {
    high: 'text-red-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500'
  }
  return map[priority] || 'text-gray-500'
}

// Parse improvement actions from plain text explanation (fallback)
const improvementActions = computed(() => {
  if (props.analysisData || !props.explanation) return []
  
  const actions: string[] = []
  const lines = props.explanation.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/^(?:\(\d+\)|\d+[.)]|[•\-*])\s*(.+)$/)
    if (match && match[1]) {
      actions.push(match[1].trim())
    }
  }
  
  return actions
})
</script>