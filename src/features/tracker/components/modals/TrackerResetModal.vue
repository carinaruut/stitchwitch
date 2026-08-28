<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppModal from '../../../../shared/ui/AppModal.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ confirm: []; 'update:open': [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })

function confirm() {
  emit('update:open', false)
  emit('confirm')
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('tracker.confirm.reset.title')"
    :close-label="t('tracker.confirm.closeDialog')"
    :backdrop-label="t('tracker.confirm.closeBackdrop')"
    size="sm"
    :show-close-button="false"
    @close="emit('update:open', false)"
  >
    <p>{{ t('tracker.confirm.reset.message') }}</p>
    <template #actions>
      <button
        class="btn"
        type="button"
        @click="emit('update:open', false)"
      >
        {{ t('tracker.confirm.cancel') }}
      </button>
      <button
        class="btn btn-error"
        type="button"
        autofocus
        @click="confirm"
      >
        {{ t('tracker.confirm.reset.action') }}
      </button>
    </template>
  </AppModal>
</template>
