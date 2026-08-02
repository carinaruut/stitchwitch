<script setup lang="ts">
import type { Notification } from '../composables/useNotifications'

defineProps<{ notifications: Notification[] }>()
defineEmits<{ dismiss: [id: number] }>()

const alertClasses = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning',
} as const
</script>

<template>
  <div class="toast toast-end toast-top z-[100] mt-14" aria-live="polite">
    <div v-for="item in notifications" :key="item.id" class="alert max-w-sm" :class="alertClasses[item.kind]">
      <span>{{ item.message }}</span>
      <button class="btn btn-ghost btn-xs" type="button" :aria-label="`Dismiss ${item.message}`" @click="$emit('dismiss', item.id)">Close</button>
    </div>
  </div>
</template>
