<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{
    rooms: any[]
    currentRoomId: string
    loading: boolean
  }>()

  const emit = defineEmits<{
    (e: 'select' | 'delete', roomId: string): void
  }>()

  const roomToDelete = ref<string | null>(null)
  const isDeleteModalOpen = ref(false)

  function confirmDelete(roomId: string) {
    roomToDelete.value = roomId
    isDeleteModalOpen.value = true
  }

  function handleDelete() {
    if (roomToDelete.value) {
      emit('delete', roomToDelete.value)
      isDeleteModalOpen.value = false
      roomToDelete.value = null
    }
  }

  const navigationItems = computed(() => {
    return props.rooms.map((room) => ({
      label: room.roomName,
      avatar: { src: room.avatar, size: 'md' as const },
      value: room.roomId,
      active: room.roomId === props.currentRoomId,
      description: room.lastMessage?.content
        ? room.lastMessage.content.substring(0, 50) +
          (room.lastMessage.content.length > 50 ? '...' : '')
        : undefined,
      onSelect: () => emit('select', room.roomId)
    }))
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto py-2 px-2">
    <div v-if="loading" class="space-y-2 py-4 px-2">
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
    >
      <template #item="{ item }">
        <div
          class="flex items-center gap-3 w-full group py-1 px-2 cursor-pointer"
          @click="item.onSelect?.()"
        >
          <UAvatar v-if="item.avatar" v-bind="item.avatar" size="sm" />
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium truncate"
              :class="item.active ? 'text-primary' : 'text-gray-900 dark:text-white'"
            >
              {{ item.label }}
            </p>
            <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ item.description }}
            </p>
          </div>
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            class="opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
            @click.stop="confirmDelete(item.value)"
          />
        </div>
      </template>
    </UNavigationMenu>

    <div v-else class="text-left py-8 text-sm text-gray-500 px-4">No chat history yet</div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Delete Chat Room">
      <template #content>
        <div class="p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Are you sure you want to delete this chat room? This action will remove it from your
            chat list.
          </p>

          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">
              Cancel
            </UButton>
            <UButton color="error" @click="handleDelete"> Delete Room </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
