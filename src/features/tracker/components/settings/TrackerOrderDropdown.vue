<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppDropdown from '../../../../shared/ui/AppDropdown.vue'
import type { TrackerCompletionMode, TrackerDirection, TrackerStartRow } from '../../../../types/tracker'

defineProps<{
  completionMode: TrackerCompletionMode
  startRow: TrackerStartRow
  firstRowDirection: TrackerDirection
  alternateRows: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:completionMode': [value: TrackerCompletionMode]
  'update:startRow': [value: TrackerStartRow]
  'update:firstRowDirection': [value: TrackerDirection]
  'update:alternateRows': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppDropdown
    :label="t('tracker.controls.trackingOptions')"
    align="left"
    width="sm"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="t('tracker.controls.trackingOptions')"
        :title="t('tracker.controls.trackingOptions')"
        aria-haspopup="true"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="mdi mdi-format-list-checks text-xl"
          aria-hidden="true"
        />
      </button>
    </template>
    <div class="app-settings-panel">
      <label class="app-field">
        <span class="app-field-label">{{ t('tracker.mode.label') }}</span>
        <select
          class="select select-bordered select-sm w-full"
          :value="completionMode"
          :disabled="disabled"
          @change="emit('update:completionMode', ($event.target as HTMLSelectElement).value as TrackerCompletionMode)"
        >
          <option value="sequential">{{ t('tracker.mode.sequential') }}</option>
          <option value="individual">{{ t('tracker.mode.individual') }}</option>
        </select>
      </label>
      <label class="app-field">
        <span class="app-field-label">{{ t('tracker.order.startRow') }}</span>
        <select
          class="select select-bordered select-sm w-full"
          :value="startRow"
          :disabled="disabled"
          @change="emit('update:startRow', ($event.target as HTMLSelectElement).value as TrackerStartRow)"
        >
          <option value="top">{{ t('tracker.order.top') }}</option>
          <option value="bottom">{{ t('tracker.order.bottom') }}</option>
        </select>
      </label>
      <label class="app-field">
        <span class="app-field-label">{{ t('tracker.order.firstRowDirection') }}</span>
        <select
          class="select select-bordered select-sm w-full"
          :value="firstRowDirection"
          :disabled="disabled"
          @change="emit('update:firstRowDirection', ($event.target as HTMLSelectElement).value as TrackerDirection)"
        >
          <option value="left-to-right">{{ t('tracker.order.leftToRight') }}</option>
          <option value="right-to-left">{{ t('tracker.order.rightToLeft') }}</option>
        </select>
      </label>
      <label class="app-toggle-row">
        <span class="app-toggle-title">{{ t('tracker.order.alternate') }}</span>
        <input
          class="toggle toggle-primary toggle-sm"
          type="checkbox"
          :checked="alternateRows"
          :disabled="disabled"
          @change="emit('update:alternateRows', ($event.target as HTMLInputElement).checked)"
        >
      </label>
    </div>
  </AppDropdown>
</template>
