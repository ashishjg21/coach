<script setup lang="ts">
  import ChatToolCall from '~/components/ChatToolCall.vue'

  defineProps<{
    messages: any[]
    status: any
    loading: boolean
  }>()
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <UContainer class="h-full">
      <div v-if="loading" class="space-y-6 py-8">
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
        <UChatMessages :messages="messages" :status="status">
          <template #content="{ message }">
            <div v-if="message.parts && message.parts.length">
              <template
                v-for="(part, index) in message.parts"
                :key="`${message.id}-${part.type}-${index}`"
              >
                <!-- Text Part -->
                <div
                  v-if="part.type === 'text'"
                  class="prose prose-sm dark:prose-invert max-w-none"
                >
                  <MDC :value="part.text" :cache-key="`${message.id}-${index}`" />
                </div>

                <!-- Tool Invocation Part (Generic or Specific) -->
                <ChatToolCall
                  v-else-if="part.type === 'tool-invocation' || part.type.startsWith('tool-')"
                  :tool-call="{
                    name:
                      (part as any).toolName ||
                      (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : ''),
                    args: (part as any).args || (part as any).input,
                    response: (part as any).result || (part as any).output,
                    error: (part as any).errorText || (part as any).error,
                    timestamp:
                      (message as any).createdAt &&
                      !isNaN(new Date((message as any).createdAt).getTime())
                        ? new Date((message as any).createdAt).toISOString()
                        : new Date().toISOString(),
                    status:
                      (part as any).state === 'result' || (part as any).state === 'output-available'
                        ? 'success'
                        : (part as any).state === 'error' ||
                            (part as any).state === 'output-error' ||
                            (part as any).state === 'output-denied'
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
                  <pre class="text-[9px] mt-1">{{ JSON.stringify(part, null, 2) }}</pre>
                </div>
              </template>
            </div>
            <div v-else class="prose prose-sm dark:prose-invert max-w-none">
              <MDC :value="(message as any).content" />
            </div>
          </template>
        </UChatMessages>
      </div>
    </UContainer>
  </div>
</template>
