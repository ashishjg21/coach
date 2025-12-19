<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Changelog" />
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto p-6 space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold uppercase tracking-tight">Version History</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">Current version: v{{ config.public.version }}</p>
              </div>
            </div>
          </template>

          <div v-if="pending" class="py-8 text-center text-gray-500">
            Loading changelog...
          </div>
          
          <div v-else-if="error" class="py-8 text-center text-red-500">
            Failed to load changelog.
          </div>

          <div v-else class="prose dark:prose-invert max-w-none">
            <MDC :value="data?.content || ''" />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const { data, pending, error } = await useFetch('/api/changelog')
</script>
