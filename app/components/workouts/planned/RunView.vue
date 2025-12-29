<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Run Details</h3>
      <div class="flex gap-2">
         <UButton 
          size="sm" 
          color="neutral" 
          variant="ghost" 
          icon="i-heroicons-adjustments-horizontal" 
          @click="$emit('adjust')"
        >
          Adjust
        </UButton>
        <UButton 
          size="sm" 
          color="neutral" 
          variant="ghost" 
          icon="i-heroicons-arrow-path" 
          :loading="generating" 
          @click="$emit('regenerate')"
        >
          Regenerate
        </UButton>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="hasStructure" class="grid grid-cols-2 gap-4 mb-6">
       <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div class="text-xs text-muted mb-1">Total Distance (Est.)</div>
          <div class="text-xl font-bold">{{ (totalDistance / 1000).toFixed(1) }} km</div>
       </div>
       <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div class="text-xs text-muted mb-1">Avg Intensity</div>
          <div class="text-xl font-bold">{{ Math.round(avgIntensity * 100) }}%</div>
       </div>
    </div>

    <!-- HR Zone Distribution -->
    <div v-if="hrDistribution.length > 0" class="mb-6">
      <h4 class="text-sm font-semibold text-muted mb-3">Heart Rate Zones</h4>
      
      <!-- Stacked Bar -->
      <div class="h-4 w-full rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700 mb-2">
        <div 
          v-for="(zone, index) in hrDistribution" 
          :key="index"
          class="h-full"
          :style="{ 
            width: `${zone.percent}%`,
            backgroundColor: zone.color
          }"
        ></div>
      </div>
      
      <!-- Legend -->
      <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs">
         <div v-for="zone in hrDistribution" :key="zone.name" class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: zone.color }"></div>
            <span class="text-muted">{{ zone.name }}:</span>
            <span class="font-medium">{{ zone.formattedDuration }}</span>
         </div>
      </div>
    </div>

    <!-- Run Structure (Simple Text for now, can be upgraded to graph later) -->
     <div v-if="workout.structuredWorkout?.steps" class="space-y-4">
        <div v-for="(step, index) in workout.structuredWorkout.steps" :key="index" class="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
             <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold text-sm mr-4">
                 {{ Number(index) + 1 }}
             </div>
             <div class="flex-1">
                 <div class="font-medium">{{ step.name || step.type }}</div>
                 <div class="text-sm text-muted">
                    <span v-if="step.durationSeconds">{{ formatDuration(step.durationSeconds) }}</span>
                    <span v-else-if="step.duration">{{ formatDuration(step.duration) }}</span>
                    <span v-else-if="step.distance">{{ step.distance }}m</span>
                    <span class="mx-2">•</span>
                    <span v-if="step.description">{{ step.description }}</span>
                    <span v-else-if="step.targetPower">Pace: {{ getPaceFromPower(step.targetPower) }}</span>
                    <span v-else-if="step.heartRate?.value">HR: {{ Math.round(step.heartRate.value * 100) }}% LTHR</span>
                    <span v-else>Easy Pace</span>
                 </div>
             </div>
        </div>
     </div>
      <div v-else class="text-center py-8 text-muted">
        No structured run steps available.
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  workout: any
  generating?: boolean
}>()

defineEmits(['adjust', 'regenerate'])

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getPaceFromPower(power: number) {
    // Placeholder logic for running power -> pace
    return "5:00 /km" 
}

const hasStructure = computed(() => !!props.workout.structuredWorkout?.steps?.length)

const totalDistance = computed(() => {
  if (!props.workout.structuredWorkout?.steps) return 0
  return props.workout.structuredWorkout.steps.reduce((sum: number, step: any) => sum + (step.distance || 0), 0)
})

const avgIntensity = computed(() => {
  const steps = props.workout.structuredWorkout?.steps
  if (!steps?.length) return 0
  
  let totalWeighted = 0
  let totalDuration = 0
  
  steps.forEach((step: any) => {
    const duration = step.durationSeconds || 60
    const intensity = step.heartRate?.value || step.power?.value || (step.type === 'Rest' ? 0.5 : 0.75)
    totalWeighted += intensity * duration
    totalDuration += duration
  })
  
  return totalDuration > 0 ? totalWeighted / totalDuration : 0
})

const hrDistribution = computed(() => {
  const steps = props.workout.structuredWorkout?.steps
  if (!steps?.length) return []
  
  // Zones: Z1 (<0.75), Z2 (0.75-0.85), Z3 (0.85-0.95), Z4 (0.95-1.05), Z5 (>1.05)
  const zones = [
    { name: 'Z1', min: 0, max: 0.75, color: '#9ca3af', duration: 0 },
    { name: 'Z2', min: 0.75, max: 0.85, color: '#3b82f6', duration: 0 },
    { name: 'Z3', min: 0.85, max: 0.95, color: '#22c55e', duration: 0 },
    { name: 'Z4', min: 0.95, max: 1.05, color: '#eab308', duration: 0 },
    { name: 'Z5', min: 1.05, max: 9.99, color: '#ef4444', duration: 0 },
  ]
  
  let totalDuration = 0
  
  steps.forEach((step: any) => {
    const duration = step.durationSeconds || 60
    const intensity = step.heartRate?.value || (step.type === 'Rest' ? 0.6 : 0.8) // fallback if HR missing
    
    // Only count active/known steps or just everything? 
    // Let's count everything based on intensity estimate
    totalDuration += duration
    
    const zone = zones.find(z => intensity <= z.max) || zones[zones.length - 1]
    zone.duration += duration
  })
  
  if (totalDuration === 0) return []
  
  return zones.map(z => ({
    ...z,
    percent: (z.duration / totalDuration) * 100,
    formattedDuration: formatDuration(z.duration)
  })).filter(z => z.duration > 0)
})
</script>
