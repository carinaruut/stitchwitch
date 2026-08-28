<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppDropdown from '../../../../shared/ui/AppDropdown.vue'
import type { PatternDisplay } from '../../../../types/pattern'
import type { TrackerFocusStyle } from '../../../../types/tracker'
import TrackerFocusSettings from './TrackerFocusSettings.vue'

defineProps<{
  display: PatternDisplay
  cellSize: number
  autoScroll: boolean
  showSymbols: boolean
  showAnnotations: boolean
  keepAwake: boolean
  wakeLockSupported: boolean
  focusMode: boolean
  focusStyle: TrackerFocusStyle
  focusNeighborRows: number
}>()

const emit = defineEmits<{
  'update:display': [value: PatternDisplay]
  'update:cellSize': [value: number]
  'update:autoScroll': [value: boolean]
  'update:showSymbols': [value: boolean]
  'update:showAnnotations': [value: boolean]
  'update:keepAwake': [value: boolean]
  'update:focusMode': [value: boolean]
  'update:focusStyle': [value: TrackerFocusStyle]
  'update:focusNeighborRows': [value: number]
}>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppDropdown
    :label="t('tracker.controls.settings')"
    align="right"
    width="sm"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="t('tracker.controls.settings')"
        :title="t('tracker.controls.settings')"
        aria-haspopup="true"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="mdi mdi-cog-outline text-xl"
          aria-hidden="true"
        />
      </button>
    </template>
    <div class="app-settings-panel">
      <label class="app-field">
        <span class="app-field-label">{{ t('tracker.controls.display') }}</span>
        <select
          class="select select-bordered select-sm w-full"
          :value="display"
          :aria-label="t('tracker.controls.displayAria')"
          @change="emit('update:display', ($event.target as HTMLSelectElement).value as PatternDisplay)"
        >
          <option value="canvas">
            {{ t('tracker.controls.canvas') }}
          </option>
          <option value="knit">
            {{ t('tracker.controls.knit') }}
          </option>
          <option value="cross-stitch">
            {{ t('tracker.controls.crossStitch') }}
          </option>
          <option value="single-crochet">
            {{ t('tracker.controls.singleCrochet') }}
          </option>
        </select>
      </label>
      <label class="app-field">
        <span class="app-field-label flex items-center justify-between gap-3"><span>{{ t('tracker.controls.cellSize') }}</span><span class="font-mono font-normal tabular-nums">{{ cellSize }} px</span></span>
        <input
          class="range range-xs w-full"
          type="range"
          min="16"
          max="48"
          :value="cellSize"
          :aria-label="t('tracker.controls.cellSize')"
          @input="emit('update:cellSize', ($event.target as HTMLInputElement).valueAsNumber)"
        >
      </label>
      <label class="app-toggle-row"><span class="app-toggle-title">{{ t('tracker.controls.autoScroll') }}</span><input
        class="toggle toggle-primary toggle-sm"
        type="checkbox"
        :checked="autoScroll"
        @change="emit('update:autoScroll', ($event.target as HTMLInputElement).checked)"
      ></label>
      <label class="app-toggle-row"><span class="app-toggle-title">{{ t('tracker.controls.showSymbols') }}</span><input
        class="toggle toggle-primary toggle-sm"
        type="checkbox"
        :checked="showSymbols"
        @change="emit('update:showSymbols', ($event.target as HTMLInputElement).checked)"
      ></label>
      <label class="app-toggle-row"><span class="app-toggle-title">{{ t('tracker.controls.showAnnotations') }}</span><input
        class="toggle toggle-primary toggle-sm"
        type="checkbox"
        :checked="showAnnotations"
        @change="emit('update:showAnnotations', ($event.target as HTMLInputElement).checked)"
      ></label>
      <label
        v-if="wakeLockSupported"
        class="app-toggle-row"
      ><span class="app-toggle-title">{{ t('tracker.controls.keepAwake') }}</span><input
        class="toggle toggle-primary toggle-sm"
        type="checkbox"
        :checked="keepAwake"
        @change="emit('update:keepAwake', ($event.target as HTMLInputElement).checked)"
      ></label>
      <TrackerFocusSettings
        :enabled="focusMode"
        :style="focusStyle"
        :neighbor-rows="focusNeighborRows"
        @update:enabled="emit('update:focusMode', $event)"
        @update:style="emit('update:focusStyle', $event)"
        @update:neighbor-rows="emit('update:focusNeighborRows', $event)"
      />
    </div>
  </AppDropdown>
</template>
