<template>
  <div class="p-8 max-w-4xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Timezone Debugger</h1>
      <UButton icon="i-heroicons-clipboard" color="primary" @click="copyReport">
        Copy Report
      </UButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Client Side -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Client (Browser)</h3>
        </template>
        <div class="space-y-2 text-sm font-mono">
          <div>
            <span class="text-gray-500">Timezone:</span>
            <div class="font-bold">{{ clientInfo.timezone }}</div>
          </div>
          <div>
            <span class="text-gray-500">Current Time:</span>
            <div>{{ clientInfo.time }}</div>
          </div>
          <div>
            <span class="text-gray-500">ISO String:</span>
            <div>{{ clientInfo.iso }}</div>
          </div>
          <div>
            <span class="text-gray-500">User Agent:</span>
            <div class="break-all text-xs">{{ clientInfo.userAgent }}</div>
          </div>
        </div>
      </UCard>

      <!-- Server Side -->
      <UCard>
        <template #header>
          <h3 class="font-bold">Server (API)</h3>
        </template>
        <div v-if="serverInfo" class="space-y-2 text-sm font-mono">
          <div>
            <span class="text-gray-500">Timezone:</span>
            <div class="font-bold">{{ serverInfo.serverTimezone }}</div>
          </div>
          <div>
            <span class="text-gray-500">Current Time:</span>
            <div>{{ serverInfo.serverTime }}</div>
          </div>
          <div>
            <span class="text-gray-500">ISO String:</span>
            <div>{{ serverInfo.serverTimeISO }}</div>
          </div>
          <div>
            <span class="text-gray-500">process.env.TZ:</span>
            <div>{{ serverInfo.processEnvTZ || 'Not Set' }}</div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-40">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin w-6 h-6" />
        </div>
      </UCard>
    </div>

    <!-- Application State -->
    <UCard>
      <template #header>
        <h3 class="font-bold">Application State</h3>
      </template>
      <div class="space-y-2 text-sm font-mono">
        <div>
          <span class="text-gray-500">User Profile Timezone:</span>
          <div class="font-bold">{{ user?.timezone || 'Not Set' }}</div>
        </div>
        <div class="pt-4 border-t dark:border-gray-700">
          <h4 class="font-bold mb-2">Calendar Logic Test</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-gray-500">Jan 18, 2026 is:</span>
              <div class="font-bold text-lg">{{ testDate2026 }}</div>
              <div class="text-xs text-gray-500">Should be Sunday</div>
            </div>
            <div>
              <span class="text-gray-500">Jan 18, 2027 is:</span>
              <div class="font-bold text-lg">{{ testDate2027 }}</div>
              <div class="text-xs text-gray-500">Should be Monday</div>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  const { data: user } = useAuth()

  // Client Info
  const clientInfo = ref({
    timezone: '',
    time: '',
    iso: '',
    userAgent: ''
  })

  // Server Info
  const { data: serverInfo } = await useFetch('/api/debug/time')

  // Calendar Tests
  const testDate2026 = ref('')
  const testDate2027 = ref('')

  onMounted(() => {
    // Capture Client Info
    const now = new Date()
    clientInfo.value = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      time: now.toString(),
      iso: now.toISOString(),
      userAgent: navigator.userAgent
    }

    // Run Calendar Logic Tests
    // Explicitly construct dates using the same logic as the calendar component might
    // (or just native Date to check browser environment)
    const d2026 = new Date('2026-01-18T12:00:00')
    testDate2026.value = d2026.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const d2027 = new Date('2027-01-18T12:00:00')
    testDate2027.value = d2027.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  })

  const copyReport = () => {
    const report = {
      client: clientInfo.value,
      server: serverInfo.value,
      userProfile: {
        timezone: user.value?.timezone,
        id: user.value?.id
      },
      calendarTest: {
        jan18_2026: testDate2026.value,
        jan18_2027: testDate2027.value
      }
    }

    navigator.clipboard.writeText(JSON.stringify(report, null, 2))

    const toast = useToast()
    toast.add({
      title: 'Report Copied',
      description: 'Paste this into the chat to help us debug.',
      color: 'success'
    })
  }
</script>
