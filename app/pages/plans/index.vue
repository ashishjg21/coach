<template>
  <UDashboardPanel id="my-plans">
    <template #header>
      <UDashboardNavbar title="My Plans" />
    </template>

    <template #body>
      <div class="p-6 space-y-8">
        <!-- Templates Section -->
        <div>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-bookmark" class="w-5 h-5 text-primary" />
            Templates
          </h3>
          <div v-if="templates.length === 0" class="text-muted text-sm italic">
            No templates saved yet. Save a plan as a template to reuse it later.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UCard v-for="plan in templates" :key="plan.id" class="relative group hover:border-primary/50 transition-colors">
              <template #header>
                <div class="flex justify-between items-start">
                  <div class="font-bold truncate pr-4">{{ plan.name || 'Untitled Template' }}</div>
                  <UBadge color="gray" variant="soft" size="xs">{{ plan.strategy }}</UBadge>
                </div>
              </template>
              
              <p class="text-sm text-muted line-clamp-3 h-10 mb-4">
                {{ plan.description || 'No description provided.' }}
              </p>
              
              <template #footer>
                <div class="flex justify-end gap-2">
                  <!-- Reuse logic would go here -->
                  <UButton size="xs" color="primary" variant="ghost" icon="i-heroicons-play" disabled title="Coming Soon: Start Plan">
                    Use
                  </UButton>
                </div>
              </template>
            </UCard>
          </div>
        </div>

        <USeparator />

        <!-- Past Plans Section -->
        <div>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-500" />
            Plan History
          </h3>
          <div v-if="history.length === 0" class="text-muted text-sm italic">
            No plan history found.
          </div>
          <div v-else class="space-y-3">
            <UCard v-for="plan in history" :key="plan.id" :ui="{ body: { padding: 'p-3 sm:p-4' } }">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-semibold">{{ plan.goal?.title || 'Unnamed Plan' }}</div>
                  <div class="text-xs text-muted mt-1">
                    Created {{ new Date(plan.createdAt).toLocaleDateString() }} • 
                    <span :class="getStatusColor(plan.status)">{{ plan.status }}</span>
                  </div>
                </div>
                <!-- Actions could go here, like 'View' or 'Delete' -->
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { data: plans } = await useFetch<any[]>('/api/plans')

const templates = computed(() => plans.value?.filter(p => p.isTemplate) || [])
const history = computed(() => plans.value?.filter(p => !p.isTemplate) || [])

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'text-green-500'
    case 'ABANDONED': return 'text-red-500'
    case 'ARCHIVED': return 'text-gray-500'
    default: return 'text-gray-500'
  }
}
</script>
