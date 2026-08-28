<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TrackerFocusStyle } from '../../../../types/tracker'

defineProps<{
  enabled: boolean
  style: TrackerFocusStyle
  neighborRows: number
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:style': [value: TrackerFocusStyle]
  'update:neighborRows': [value: number]
}>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <fieldset class="app-settings-section">
    <legend class="sr-only">
      {{ t('tracker.focus.title') }}
    </legend>
    <label class="app-toggle-row">
      <span class="app-toggle-copy">
        <span class="app-toggle-title">{{ t('tracker.focus.title') }}</span>
        <span class="app-toggle-description">{{ t('tracker.focus.description') }}</span>
      </span>
      <input
        class="toggle toggle-primary toggle-sm"
        type="checkbox"
        :checked="enabled"
        @change="emit('update:enabled', ($event.target as HTMLInputElement).checked)"
      >
    </label>
    <label
      v-if="enabled"
      class="app-field"
    >
      <span class="app-field-label">{{ t('tracker.focus.outsideRows') }}</span>
      <select
        class="select select-bordered select-sm w-full"
        :value="style"
        @change="emit('update:style', ($event.target as HTMLSelectElement).value as TrackerFocusStyle)"
      >
        <option value="dim">{{ t('tracker.focus.dim') }}</option>
        <option value="hide">{{ t('tracker.focus.hide') }}</option>
      </select>
    </label>
    <label
      v-if="enabled"
      class="app-field"
    >
      <span class="app-field-label flex items-center justify-between gap-3">
        <span>{{ t('tracker.focus.neighborRows') }}</span>
        <span class="font-mono font-normal tabular-nums">{{ neighborRows }}</span>
      </span>
      <input
        class="range range-xs w-full"
        type="range"
        min="0"
        max="5"
        step="1"
        :value="neighborRows"
        :aria-label="t('tracker.focus.neighborRows')"
        @input="emit('update:neighborRows', ($event.target as HTMLInputElement).valueAsNumber)"
      >
    </label>
  </fieldset>
</template>
