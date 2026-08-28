<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Notification } from '../composables/useNotifications'

withDefaults(defineProps<{
  closeLabelKey?: string
  dismissAriaKey?: string
  notifications: Notification[]
}>(), {
  closeLabelKey: 'editor.notifications.close',
  dismissAriaKey: 'editor.notifications.dismiss',
})
defineEmits<{ dismiss: [id: number] }>()
const { t } = useI18n({ useScope: 'global' })

const alertClasses = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning',
} as const
</script>

<template>
  <div
    class="toast toast-end toast-top z-[100] mt-14"
    aria-live="polite"
  >
    <div
      v-for="item in notifications"
      :key="item.id"
      class="alert max-w-sm"
      :class="alertClasses[item.kind]"
    >
      <span>{{ item.message }}</span>
      <button
        class="btn btn-ghost btn-xs"
        type="button"
        :aria-label="t(dismissAriaKey, { message: item.message })"
        @click="$emit('dismiss', item.id)"
      >
        {{ t(closeLabelKey) }}
      </button>
    </div>
  </div>
</template>
