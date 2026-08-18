<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; destructive?: boolean }>()
defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div
    v-if="open"
    class="modal modal-open"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    @keydown.esc="$emit('cancel')"
  >
    <div class="modal-box">
      <h2 class="text-lg font-bold">
        {{ title }}
      </h2>
      <p class="py-4">
        {{ message }}
      </p>
      <div class="modal-action">
        <button
          class="btn"
          type="button"
          @click="$emit('cancel')"
        >
          {{ t('editor.modal.cancel') }}
        </button>
        <button
          class="btn"
          :class="destructive ? 'btn-error' : 'btn-primary'"
          type="button"
          autofocus
          @click="$emit('confirm')"
        >
          {{ confirmLabel ?? t('editor.modal.continue') }}
        </button>
      </div>
    </div>
    <button
      class="modal-backdrop"
      type="button"
      :aria-label="t('editor.modal.closeDialog')"
      @click="$emit('cancel')"
    >
      {{ t('editor.modal.close') }}
    </button>
  </div>
</template>
