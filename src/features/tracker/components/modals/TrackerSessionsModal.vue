<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TrackerController } from '../../composables/useTracker'
import AppModal from '../../../../shared/ui/AppModal.vue'
import TrackerSessions from '../TrackerSessions.vue'

defineProps<{ open: boolean; now: number; state: TrackerController }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppModal
    :open="open"
    :title="t('tracker.sessions.title')"
    :description="t('tracker.sessions.description')"
    :close-label="t('tracker.sessions.close')"
    size="md"
    @close="emit('update:open', false)"
  >
    <TrackerSessions
      :now="now"
      :state="state"
    />
  </AppModal>
</template>
