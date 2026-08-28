<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TrackerController } from '../../composables/useTracker'
import AppModal from '../../../../shared/ui/AppModal.vue'
import TrackerNotesCounters from '../TrackerNotesCounters.vue'

defineProps<{ open: boolean; rowIds: string[]; state: TrackerController }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppModal
    :open="open"
    :title="t('tracker.tools.title')"
    :description="t('tracker.tools.description')"
    :close-label="t('tracker.tools.close')"
    size="lg"
    @close="emit('update:open', false)"
  >
    <TrackerNotesCounters
      :row-ids="rowIds"
      :state="state"
    />
  </AppModal>
</template>
