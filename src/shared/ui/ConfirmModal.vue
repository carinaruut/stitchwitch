<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppModal from './AppModal.vue'

defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string; destructive?: boolean }>()
defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    :close-label="t('editor.modal.closeDialog')"
    :backdrop-label="t('editor.modal.close')"
    size="base"
    :show-close-button="false"
    @close="$emit('cancel')"
  >
    <p>{{ message }}</p>
    <template #actions>
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
    </template>
  </AppModal>
</template>
