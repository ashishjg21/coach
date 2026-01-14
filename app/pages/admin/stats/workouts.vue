<script setup lang="ts">
  import {
    Chart as ChartJS,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale
  } from 'chart.js'
  import { Bar } from 'vue-chartjs'

  ChartJS.register(Tooltip, Legend, BarElement, CategoryScale, LinearScale)

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const { data: stats, pending } = await useFetch('/api/admin/stats/workouts')

  useHead({
    title: 'Workout Stats'
  })

  // Chart Options for Stacked Bar
  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        beginAtZero: true
      }
    }
  }

  // Consistent colors for workout types
  const getWorkoutColor = (type: string) => {
    const colors: Record<string, string> = {
      Ride: '#ef4444', // Red
      Run: '#3b82f6', // Blue
      Swim: '#0ea5e9', // Light Blue
      WeightTraining: '#f59e0b', // Amber
      Walk: '#10b981', // Emerald
      Hike: '#22c55e', // Green
      Yoga: '#8b5cf6', // Purple
      Workout: '#6366f1' // Indigo
    }
    // Fallback hash color
    if (!colors[type]) {
      let hash = 0
      for (let i = 0; i < type.length; i++) {
        hash = type.charCodeAt(i) + ((hash << 5) - hash)
      }
      const c = (hash & 0x00ffffff).toString(16).toUpperCase()
      return '#' + '00000'.substring(0, 6 - c.length) + c
    }
    return colors[type]
  }

  const dailyVolumeChartData = computed(() => {
    if (!stats.value?.workoutsByDay) return { labels: [], datasets: [] }

    const data = stats.value.workoutsByDay
    // Get unique dates sorted
    const dates = [...new Set(data.map((d: any) => d.date))].sort()
    // Get unique types
    const types = [...new Set(data.map((d: any) => d.type))]

    return {
      labels: dates.map((d: any) =>
        new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      datasets: types.map((type: any) => {
        return {
          label: type,
          backgroundColor: getWorkoutColor(type),
          data: dates.map((date: any) => {
            const entry = data.find((d: any) => d.date === date && d.type === type)
            return entry ? entry.count : 0
          })
        }
      })
    }
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
      <UButton to="/admin/stats" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Workout Stats</h1>
    </div>

    <div class="p-6 space-y-6">
      <div v-if="pending" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <template v-else>
        <!-- Global Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
          <UCard>
            <div class="text-center">
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Total Workouts
              </div>
              <div class="text-2xl font-bold">
                {{ stats?.global.totalWorkouts.toLocaleString() }}
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Total Distance
              </div>
              <div class="text-2xl font-bold">
                {{ Math.round(stats?.global.totalDistanceKm || 0).toLocaleString() }}
                <span class="text-sm font-normal text-gray-500">km</span>
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Total Duration
              </div>
              <div class="text-2xl font-bold">
                {{ Math.round(stats?.global.totalDurationHours || 0).toLocaleString() }}
                <span class="text-sm font-normal text-gray-500">hrs</span>
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Total TSS
              </div>
              <div class="text-2xl font-bold">
                {{ Math.round(stats?.global.totalTss || 0).toLocaleString() }}
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Total Energy
              </div>
              <div class="text-2xl font-bold">
                {{ Math.round(stats?.global.totalKj || 0).toLocaleString() }}
                <span class="text-sm font-normal text-gray-500">kJ</span>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Daily Volume Chart -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-bold uppercase tracking-tight">Daily Ingestion Volume</h2>
              <span class="text-xs text-gray-500">Last 30 Days</span>
            </div>
          </template>
          <div class="h-64 relative">
            <Bar :data="dailyVolumeChartData" :options="stackedBarOptions" />
          </div>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Type Breakdown -->
          <UCard class="md:col-span-1">
            <template #header>
              <h3 class="font-semibold">By Type</h3>
            </template>
            <div class="space-y-3">
              <div
                v-for="item in stats?.workoutsByType"
                :key="item.type"
                class="flex justify-between items-center text-sm"
              >
                <span class="capitalize">{{ item.type || 'Unknown' }}</span>
                <UBadge color="neutral" variant="soft">{{ item.count }}</UBadge>
              </div>
            </div>
          </UCard>

          <!-- Source Breakdown -->
          <UCard class="md:col-span-1">
            <template #header>
              <h3 class="font-semibold">By Source</h3>
            </template>
            <div class="space-y-3">
              <div
                v-for="item in stats?.workoutsBySource"
                :key="item.source"
                class="flex justify-between items-center text-sm"
              >
                <span class="capitalize">{{ item.source }}</span>
                <UBadge color="neutral" variant="soft">{{ item.count }}</UBadge>
              </div>
            </div>
          </UCard>

          <!-- Quality Stats -->
          <div class="md:col-span-1 space-y-6">
            <!-- Duplicates -->
            <UCard>
              <div class="text-center py-4">
                <div class="text-3xl font-bold text-orange-500">
                  {{ stats?.duplicates.duplicates }}
                </div>
                <div class="text-sm text-gray-500 font-medium mt-1">
                  Duplicate Workouts Detected
                </div>
                <div class="text-xs text-gray-400 mt-2">
                  {{
                    (
                      ((stats?.duplicates.duplicates || 0) / (stats?.duplicates.total || 1)) *
                      100
                    ).toFixed(1)
                  }}% of total
                </div>
              </div>
            </UCard>

            <!-- AI Coverage -->
            <UCard>
              <div class="text-center py-4">
                <div class="text-3xl font-bold text-emerald-500">
                  {{ stats?.aiCoverage.percentage.toFixed(1) }}%
                </div>
                <div class="text-sm text-gray-500 font-medium mt-1">AI Analysis Coverage</div>
                <div class="text-xs text-gray-400 mt-2">
                  {{ stats?.aiCoverage.analyzed }} / {{ stats?.aiCoverage.total }} workouts
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
