<script setup lang="ts">
defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; destructive?: boolean }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div v-if="open" class="modal modal-open" role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="$emit('cancel')">
    <div class="modal-box">
      <h2 class="text-lg font-bold">{{ title }}</h2>
      <p class="py-4">{{ message }}</p>
      <div class="modal-action">
        <button class="btn" type="button" @click="$emit('cancel')">Cancel</button>
        <button class="btn" :class="destructive ? 'btn-error' : 'btn-primary'" type="button" autofocus @click="$emit('confirm')">{{ confirmLabel ?? 'Continue' }}</button>
      </div>
    </div>
    <button class="modal-backdrop" type="button" aria-label="Close dialog" @click="$emit('cancel')">close</button>
  </div>
</template>
