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
    <div class="w-72 p-4">
      <div class="flex flex-col gap-4">
        <label class="form-control gap-2">
          <span class="text-xs font-semibold">{{ t('tracker.mode.label') }}</span>
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
        <label class="form-control gap-2">
          <span class="text-xs font-semibold">{{ t('tracker.order.startRow') }}</span>
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
        <label class="form-control gap-2">
          <span class="text-xs font-semibold">{{ t('tracker.order.firstRowDirection') }}</span>
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
        <label class="flex items-center justify-between gap-3 text-sm">
          <span>{{ t('tracker.order.alternate') }}</span>
          <input
            class="toggle toggle-primary toggle-sm"
            type="checkbox"
            :checked="alternateRows"
            :disabled="disabled"
            @change="emit('update:alternateRows', ($event.target as HTMLInputElement).checked)"
          >
        </label>
      </div>
    </div>
  </AppDropdown>
</template>
