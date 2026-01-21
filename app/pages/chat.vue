<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useChat } from '@ai-sdk/vue'
  import DashboardTriggerMonitorButton from '~/components/dashboard/TriggerMonitorButton.vue'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'AI Chat Coach',
    meta: [
      {
        name: 'description',
        content:
          'Chat with your AI endurance coach to analyze your training, ask questions, and get personalized advice.'
      }
    ]
  })

  interface ToolCall {
    name: string
    args: Record<string, any>
    response: any
    timestamp: string
    status?: 'loading' | 'success' | 'error'
  }

  // State
  // const input = ref('') // Handled by useChat
  const currentRoomId = ref('')
  const loadingMessages = ref(true)
  const rooms = ref<any[]>([])
  const loadingRooms = ref(true)
  const isRoomListOpen = ref(false)

  // Fetch session
  const { data: session } = await useFetch('/api/auth/session')

  const route = useRoute()
  const router = useRouter()

  // Initialize Chat composable
  const {
    messages: chatMessages,
    input,
    handleSubmit,
    status,
    error,
    append,
    setMessages
  } = useChat({
    api: '/api/chat/messages',
    maxSteps: 5,
    onFinish: (message) => {
      console.log('[Chat] onFinish triggered for message:', message.id)
      // Refresh rooms to update last message/titles
      loadRooms(false)
    },
    onError: (error) => {
      console.error('[Chat] onError triggered:', error)
    },
    onToolCall: (toolCall) => {
      console.log('[Chat] onToolCall triggered:', toolCall.toolCall.toolName)
    },
    body: computed(() => ({
      roomId: currentRoomId.value
    }))
  })

  // Reactive watcher for debugging parts during streaming
  watch(
    () => chatMessages.value[chatMessages.value.length - 1]?.parts,
    (parts, oldParts) => {
      if (!parts) return
      const lastMsg = chatMessages.value[chatMessages.value.length - 1]
      console.log(
        `[Chat] Watcher: Msg ${lastMsg.id} (${lastMsg.role}) parts updated. Count: ${parts.length}`
      )
    },
    { deep: true }
  )

  // Form submission handler
  const onSubmit = (e?: Event) => {
    if (e) e.preventDefault()
    if (!input.value.trim() || !currentRoomId.value) return

    handleSubmit(e, {
      body: {
        content: input.value
      }
    })
  }

  // Computed navigation items for UNavigationMenu
  const navigationItems = computed(() => {
    return rooms.value.map((room) => ({
      label: room.roomName,
      avatar: { src: room.avatar, size: 'md' as const },
      value: room.roomId,
      active: room.roomId === currentRoomId.value,
      description: room.lastMessage?.content
        ? room.lastMessage.content.substring(0, 50) +
          (room.lastMessage.content.length > 50 ? '...' : '')
        : undefined,
      onSelect: () => selectRoom(room.roomId)
    }))
  })

  // Load initial room and messages
  onMounted(async () => {
    await loadChat()
  })

  async function loadRooms(selectFirst = true) {
    try {
      if (selectFirst) loadingRooms.value = true
      const loadedRooms = await $fetch<any[]>('/api/chat/rooms')
      rooms.value = loadedRooms

      // Select first room if we don't have a current one
      if (selectFirst && !currentRoomId.value && loadedRooms.length > 0 && loadedRooms[0]) {
        await selectRoom(loadedRooms[0].roomId)
      }
    } catch (err: any) {
      console.error('Failed to load rooms:', err)
    } finally {
      loadingRooms.value = false
    }
  }

  async function loadMessages(roomId: string) {
    try {
      loadingMessages.value = true
      const loadedMessages = await $fetch<any[]>(`/api/chat/messages?roomId=${roomId}`)

      // Transform DB messages to AI SDK format (UIMessage)
      const transformedMessages = loadedMessages.map((msg) => ({
        id: msg.id,
        role: msg.senderId === 'ai_agent' ? 'assistant' : 'user',
        content: msg.content,
        parts: msg.parts || [{ type: 'text', text: msg.content }],
        createdAt: new Date(msg.createdAt),
        metadata: msg.metadata
      }))

      // Update chat messages using the setter
      setMessages(transformedMessages)
    } catch (err: any) {
      console.error('Failed to load messages:', err)
    } finally {
      loadingMessages.value = false
    }
  }

  async function loadChat() {
    await loadRooms()

    // Check for context from query params
    const workoutId = route.query.workoutId as string
    const isPlanned = route.query.isPlanned === 'true'
    const recommendationId = route.query.recommendationId as string

    if (workoutId || recommendationId) {
      // Create new chat
      await createNewChat()

      let initialText = ''
      if (workoutId) {
        initialText = isPlanned
          ? `I'd like to discuss my upcoming planned workout (ID: ${workoutId}). What should I focus on?`
          : `Please analyze my completed workout with ID ${workoutId}. How did I perform?`
      } else if (recommendationId) {
        initialText = `Can you explain this recommendation (ID: ${recommendationId}) in more detail?`
      }

      if (initialText) {
        append(
          {
            role: 'user',
            content: initialText
          },
          {
            body: {
              roomId: currentRoomId.value,
              content: initialText
            }
          }
        )
      }

      // Clear query params
      router.replace({ query: {} })
    }
  }

  async function selectRoom(roomId: string) {
    currentRoomId.value = roomId
    await loadMessages(roomId)
    isRoomListOpen.value = false
  }

  async function createNewChat() {
    try {
      const newRoom = await $fetch<any>('/api/chat/rooms', {
        method: 'POST'
      })

      // Add to rooms list
      rooms.value.unshift(newRoom)

      // Switch to new room
      await selectRoom(newRoom.roomId)
    } catch (err: any) {
      console.error('Failed to create new chat:', err)
    }
  }

  // Helper to get text from message
  function getTextFromMessage(message: any): string {
    if (!message) return ''
    if (typeof message.content === 'string' && message.content) return message.content
    if (!Array.isArray(message.parts)) return ''
    return message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n')
  }

  // Helper to get charts from message
  function getChartsFromMessage(message: any) {
    const charts = [...(message.metadata?.charts || [])]

    // Also extract from parts (for real-time updates)
    if (Array.isArray(message.parts)) {
      message.parts.forEach((part: any) => {
        if (
          part.type === 'tool-invocation' &&
          part.toolName === 'create_chart' &&
          part.state === 'result' &&
          part.result?.success
        ) {
          const chartId = `chart-${message.id}-${part.toolCallId}`
          if (!charts.find((c: any) => c.id === chartId)) {
            charts.push({
              id: chartId,
              ...part.args
            })
          }
        }
      })
    }

    return charts
  }

  // Helper to get tool calls from message
  function getToolCallsFromMessage(message: any): ToolCall[] {
    const toolCalls: ToolCall[] = []

    // Check both parts (from current stream) and metadata.toolCalls (from history)
    if (Array.isArray(message.parts)) {
      message.parts.forEach((part: any) => {
        if (part.type === 'tool-invocation') {
          toolCalls.push({
            name: part.toolName,
            args: part.args,
            response: part.result,
            timestamp: new Date().toISOString(),
            status: part.state === 'result' ? 'success' : 'loading'
          })
        }
      })
    }

    // Merge with metadata toolcalls if any (avoiding duplicates by name/args)
    if (message.metadata?.toolCalls) {
      message.metadata.toolCalls.forEach((tc: any) => {
        if (
          !toolCalls.find(
            (existing) =>
              existing.name === tc.name && JSON.stringify(existing.args) === JSON.stringify(tc.args)
          )
        ) {
          toolCalls.push(tc)
        }
      })
    }

    return toolCalls
  }

  // Get current room name
  const currentRoomName = computed(() => {
    const room = rooms.value.find((r) => r.roomId === currentRoomId.value)
    return room?.roomName || 'Coach Watts'
  })
</script>

<template>
  <UDashboardPanel id="chat" :ui="{ body: 'p-0' }">
    <template #header>
      <UDashboardNavbar :title="currentRoomName">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-clock"
            class="lg:hidden"
            @click="isRoomListOpen = true"
          />
        </template>
        <template #right>
          <DashboardTriggerMonitorButton />
          <UButton
            to="/settings/ai"
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="outline"
            size="sm"
            class="font-bold"
            aria-label="AI Settings"
          >
            <span class="hidden sm:inline">Settings</span>
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            icon="i-heroicons-chat-bubble-left-right"
            aria-label="New Chat"
            size="sm"
            class="font-bold"
            @click="createNewChat"
          >
            <span class="hidden sm:inline">New Chat</span>
            <span class="sm:hidden">Chat</span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <!-- Room List Sidebar (Desktop) -->
        <div
          class="hidden lg:flex w-64 border-r border-gray-200 dark:border-gray-800 flex-col bg-gray-50 dark:bg-gray-900/40"
        >
          <div class="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2
              class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
            >
              Chat History
            </h2>
          </div>

          <div class="flex-1 overflow-y-auto py-2 px-2">
            <div v-if="loadingRooms" class="space-y-2 py-4 px-2">
              <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-2 py-2">
                <USkeleton class="h-10 w-10 rounded-full" />
                <div class="flex-1 space-y-2">
                  <USkeleton class="h-3 w-3/4" />
                  <USkeleton class="h-2 w-1/2" />
                </div>
              </div>
            </div>

            <UNavigationMenu
              v-else-if="navigationItems.length > 0"
              orientation="vertical"
              :items="navigationItems"
              class="px-2"
            />

            <div v-else class="text-left py-8 text-sm text-gray-500 px-4">No chat history yet</div>
          </div>
        </div>

        <!-- Room List Drawer (Mobile) -->
        <USlideover v-model:open="isRoomListOpen" title="Chat History" side="left">
          <template #content>
            <div class="flex-1 overflow-y-auto py-2 px-2">
              <div v-if="loadingRooms" class="space-y-2 py-4 px-2">
                <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-2 py-2">
                  <USkeleton class="h-10 w-10 rounded-full" />
                  <div class="flex-1 space-y-2">
                    <USkeleton class="h-3 w-3/4" />
                    <USkeleton class="h-2 w-1/2" />
                  </div>
                </div>
              </div>

              <UNavigationMenu
                v-else-if="navigationItems.length > 0"
                orientation="vertical"
                :items="navigationItems"
                class="px-2"
              />

              <div v-else class="text-left py-8 text-sm text-gray-500 px-4">
                No chat history yet
              </div>
            </div>
          </template>
        </USlideover>

        <!-- Chat Messages Area -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Messages Container with proper overflow -->
          <div class="flex-1 overflow-y-auto">
            <UContainer class="h-full">
              <div v-if="loadingMessages" class="space-y-6 py-8">
                <div v-for="i in 3" :key="i" class="flex flex-col space-y-4">
                  <div class="flex items-start gap-3">
                    <USkeleton class="h-8 w-8 rounded-full" />
                    <USkeleton class="h-16 w-1/2 rounded-2xl" />
                  </div>
                  <div class="flex items-start justify-end gap-3">
                    <USkeleton class="h-16 w-1/2 rounded-2xl" />
                    <USkeleton class="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>

              <div v-else class="h-full flex flex-col">
                <UChatMessages :messages="chatMessages" :status="status">
                  <template #content="{ message }">
                    <!-- Verbose debug log for each message part -->
                    <div style="display: none">
                      {{
                        message.parts?.forEach((part, i) => {
                          console.log(
                            `[Chat] Msg ${message.id} Part ${i}:`,
                            JSON.parse(JSON.stringify(part))
                          )
                        })
                      }}
                    </div>
                    <div v-if="message.parts && message.parts.length">
                      <div v-for="(part, index) in message.parts" :key="index">
                        <!-- Text Part -->
                        <div
                          v-if="part.type === 'text'"
                          class="prose prose-sm dark:prose-invert max-w-none"
                        >
                          <MDC :value="part.text" />
                        </div>

                        <!-- Tool Invocation Part (Generic or Specific) -->
                        <ChatToolCall
                          v-else-if="
                            part.type === 'tool-invocation' || part.type.startsWith('tool-')
                          "
                          :tool-call="{
                            name:
                              part.toolName ||
                              (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : ''),
                            args: part.args || (part as any).input,
                            response: part.result || (part as any).output,
                            error: (part as any).errorText || (part as any).error,
                            timestamp:
                              message.createdAt && !isNaN(new Date(message.createdAt).getTime())
                                ? new Date(message.createdAt).toISOString()
                                : new Date().toISOString(),
                            status:
                              part.state === 'result' || part.state === 'output-available'
                                ? 'success'
                                : part.state === 'error' ||
                                    part.state === 'output-error' ||
                                    part.state === 'output-denied'
                                  ? 'error'
                                  : 'loading'
                          }"
                        />

                        <!-- Fallback Debug (ignore step-start) -->
                        <div
                          v-else-if="part.type !== 'step-start'"
                          class="text-[10px] text-red-500 border border-red-200 p-1 my-1 rounded bg-red-50 font-mono overflow-auto max-h-40"
                        >
                          <div>Unknown part type: {{ part.type }}</div>
                          <pre>{{ JSON.stringify(part, null, 2) }}</pre>
                        </div>
                      </div>
                    </div>
                    <div v-else class="prose prose-sm dark:prose-invert max-w-none">
                      <MDC :value="message.content" />
                    </div>
                  </template>
                </UChatMessages>
              </div>
            </UContainer>
          </div>

          <!-- Chat Prompt Footer -->
          <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
            <UContainer class="py-2 sm:py-4 px-2 sm:px-4">
              <UChatPrompt
                v-model="input"
                :error="error?.message || ''"
                placeholder="Ask Coach Watts..."
                @submit="onSubmit"
              >
                <UChatPromptSubmit :status="status" />
              </UChatPrompt>
            </UContainer>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
