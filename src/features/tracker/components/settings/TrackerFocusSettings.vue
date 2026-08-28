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
  <fieldset class="space-y-6 border-t border-base-300 pt-4">
    <legend class="sr-only">
      {{ t('tracker.focus.title') }}
    </legend>
    <label class="flex items-center justify-between gap-3 text-sm">
      <span>
        <span class="block font-semibold">{{ t('tracker.focus.title') }}</span>
        <span class="block text-xs text-base-content/60">{{ t('tracker.focus.description') }}</span>
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
      class="form-control gap-1"
    >
      <span class="text-xs font-semibold">{{ t('tracker.focus.outsideRows') }}</span>
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
      class="form-control gap-2"
    >
      <span class="flex items-center justify-between gap-3 text-xs font-semibold mt-4">
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
