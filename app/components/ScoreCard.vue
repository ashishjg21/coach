<template>
  <div
    :class="[
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all duration-200',
      canClick ? 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer' : ''
    ]"
    @click="handleClick"
  >
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <UIcon 
            v-if="icon" 
            :name="icon" 
            :class="[
              'w-5 h-5',
              colorClasses[color || 'gray']
            ]"
          />
          <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ title }}
          </h3>
        </div>
        
        <div class="flex items-baseline gap-2">
          <div :class="['text-3xl font-bold', compact ? 'text-2xl' : 'text-3xl', scoreColorClass]">
            {{ displayScore }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">/ 10</div>
        </div>
        
        <div class="mt-2">
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              :class="['h-2 rounded-full transition-all duration-300', scoreBarClass]"
              :style="{ width: `${(score || 0) * 10}%` }"
            ></div>
          </div>
        </div>
        
        <p v-if="!compact" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {{ scoreLabel }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  score?: number | null
  explanation?: string | null
  icon?: string
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
  compact?: boolean
}>()

const emit = defineEmits<{
  click: [data: {
    title: string
    score?: number | null
    explanation?: string | null
    color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan'
  }]
}>()

// Determine if the card is clickable
const canClick = computed(() => {
  return props.score !== null &&
         props.score !== undefined &&
         props.explanation
})

const handleClick = () => {
  // Only emit if there's a score AND an explanation
  if (props.score !== null && props.score !== undefined && props.explanation) {
    emit('click', {
      title: props.title,
      score: props.score,
      explanation: props.explanation,
      color: props.color
    })
  }
}

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

const colorClasses = {
  gray: 'text-gray-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  cyan: 'text-cyan-500'
}
</script>