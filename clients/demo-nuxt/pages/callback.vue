<template>
  <div class="max-w-md w-full">
    <UCard>
      <div class="py-12 flex flex-col items-center gap-4 text-center">
        <div v-if="loading">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin text-primary" />
          <p class="mt-4 font-bold">Exchanging code for token...</p>
        </div>

        <div v-else-if="error">
          <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500" />
          <p class="mt-4 font-bold text-red-500">{{ error }}</p>
          <UButton class="mt-6" to="/">Return to Home</UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
  const route = useRoute()
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function exchangeCode() {
    const code = route.query.code as string
    if (!code) {
      error.value = 'No authorization code received.'
      loading.value = false
      return
    }

    try {
      // Call our own local backend to exchange code for token securely
      const data: any = await $fetch('/api/auth/token', {
        method: 'POST',
        body: { code }
      })

      if (data.access_token) {
        localStorage.setItem('cw_demo_token', data.access_token)
        navigateTo('/')
      } else {
        throw new Error('Failed to receive access token')
      }
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to exchange authorization code.'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    exchangeCode()
  })
</script>
