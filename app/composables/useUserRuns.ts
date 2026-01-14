import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

export interface TriggerRun {
  id: string
  taskIdentifier: string
  status: string
  startedAt: string
  finishedAt?: string
  output?: any
  error?: any
  isTest?: boolean
}

// Global Singleton State
const runs = ref<TriggerRun[]>([])
const isConnected = ref(false)
const isLoading = ref(false)
let ws: WebSocket | null = null
let activeSubscribers = 0
let initPromise: Promise<void> | null = null
let pollInterval: NodeJS.Timeout | null = null

export function useUserRuns() {
  const { data: session } = useAuth()

  // --- Initial Fetch ---
  const fetchActiveRuns = async () => {
    if (isLoading.value && !pollInterval) return

    isLoading.value = true
    try {
      const data = await $fetch<TriggerRun[]>('/api/runs/active')

      // Create a map from the new API data
      const newRunsMap = new Map<string, TriggerRun>()
      data.forEach((run) => newRunsMap.set(run.id, run))

      // Check existing runs for any local final states we want to preserve
      // (e.g. if API is slightly behind and says EXECUTING but we know it's COMPLETED via WS)
      runs.value.forEach((existing) => {
        if (newRunsMap.has(existing.id)) {
          const apiRun = newRunsMap.get(existing.id)!
          const isLocalFinal = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(
            existing.status
          )
          const isApiFinal = ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(
            apiRun.status
          )

          if (isLocalFinal && !isApiFinal) {
            // Overwrite API run status with local final status
            Object.assign(apiRun, { ...existing, status: existing.status })
          }
        }
      })

      const finalRuns = Array.from(newRunsMap.values())
      finalRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

      runs.value = finalRuns
    } catch (e) {
      // Failed to fetch active runs
    } finally {
      isLoading.value = false
    }
  }

  // --- Polling ---
  const startPolling = () => {
    if (pollInterval) return
    pollInterval = setInterval(() => {
      if (!isConnected.value && activeSubscribers > 0) {
        fetchActiveRuns()
      }
    }, 5000)
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  // --- WebSocket ---
  const connectWebSocket = () => {
    if (ws) return
    if (!session.value?.user || !(session.value.user as any).id) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/websocket`

    ws = new WebSocket(url)

    ws.onopen = () => {
      isConnected.value = true
      stopPolling()
      if (session.value?.user && (session.value.user as any).id) {
        ws?.send(
          JSON.stringify({
            type: 'subscribe_user',
            userId: (session.value.user as any).id
          })
        )
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'run_update') {
          handleRunUpdate(data)
        }
      } catch (e) {
        // Ignore
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      ws = null
      startPolling()
      if (activeSubscribers > 0) {
        setTimeout(connectWebSocket, 3000)
      }
    }
  }

  const handleRunUpdate = (update: any) => {
    const existingIndex = runs.value.findIndex((r) => r.id === update.runId)

    const updatedRun: TriggerRun = {
      id: update.runId,
      taskIdentifier:
        update.taskIdentifier ||
        (existingIndex !== -1 ? runs.value[existingIndex]?.taskIdentifier : 'Unknown Task'),
      status: update.status,
      startedAt:
        update.startedAt ||
        (existingIndex !== -1 ? runs.value[existingIndex]?.startedAt : new Date().toISOString()),
      finishedAt: update.finishedAt,
      output: update.output,
      error: update.error
    }

    const newRuns = [...runs.value]
    if (existingIndex !== -1) {
      newRuns[existingIndex] = { ...newRuns[existingIndex], ...updatedRun }
    } else {
      newRuns.unshift(updatedRun)
    }
    runs.value = newRuns
  }

  const cancelRun = async (runId: string) => {
    await $fetch(`/api/runs/${runId}`, { method: 'DELETE' as any })
  }

  const init = async () => {
    if (!initPromise) {
      initPromise = fetchActiveRuns()
    }
    await initPromise
    connectWebSocket()
    if (!isConnected.value) {
      startPolling()
    }
  }

  if (import.meta.client) {
    watch(
      () => (session.value?.user as any)?.id,
      (newId) => {
        if (newId && !ws) {
          connectWebSocket()
        }
      }
    )
  }

  onMounted(() => {
    activeSubscribers++
    init()
  })

  onUnmounted(() => {
    activeSubscribers--
    if (activeSubscribers === 0) {
      if (ws) {
        ws.close()
        ws = null
      }
      isConnected.value = false
      initPromise = null
      stopPolling()
    }
  })

  return {
    runs,
    isConnected,
    isLoading,
    refresh: fetchActiveRuns,
    cancelRun
  }
}

export function useUserRunsState() {
  const { runs, cancelRun } = useUserRuns()

  const activeRunCount = computed(
    () =>
      runs.value.filter((r) =>
        ['EXECUTING', 'QUEUED', 'WAITING_FOR_DEPLOY', 'REATTEMPTING', 'FROZEN'].includes(r.status)
      ).length
  )

  const onTaskCompleted = (
    taskIdentifier: string,
    callback: (run: TriggerRun) => void | Promise<void>
  ) => {
    watch(
      runs,
      (newRuns, oldRuns) => {
        const newMatches = newRuns.filter((r) => r.taskIdentifier === taskIdentifier)
        newMatches.forEach((newRun) => {
          const isCompleted = newRun.status === 'COMPLETED'
          if (isCompleted) {
            const oldRun = oldRuns?.find((r) => r.id === newRun.id)
            if (oldRun && oldRun.status !== 'COMPLETED') {
              callback(newRun)
            }
          }
        })
      },
      { deep: true }
    )
  }

  return {
    activeRunCount,
    runs,
    onTaskCompleted,
    cancelRun
  }
}
