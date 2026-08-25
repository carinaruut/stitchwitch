<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PrintMode } from '../types/pattern'
import AppDropdown from './AppDropdown.vue'

const props = defineProps<{
  context: 'editor' | 'tracker'
  includeAnnotations: boolean
}>()
const emit = defineEmits<{
  switch: []
  save: []
  png: []
  print: [mode: PrintMode]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
const switchLabel = computed(() => t(props.context === 'editor' ? 'editor.nav.tracker' : 'tracker.actions.openEditor'))
const switchIcon = computed(() => props.context === 'editor' ? 'mdi-progress-check' : 'mdi-pencil-ruler')

function requestDownload(close: (focusAnchor?: boolean) => void, action: () => void) {
  close(true)
  action()
}
</script>

<template>
  <div
    class="flex w-full shrink-0 items-center justify-start gap-1 border-t border-base-300 pt-1 lg:ml-auto lg:w-auto lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0"
    :aria-label="t('controls.drawing.patternSettings')"
  >
    <div
      class="tooltip"
      :data-tip="switchLabel"
    >
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="switchLabel"
        @click="emit('switch')"
      >
        <span
          class="mdi text-xl"
          :class="switchIcon"
          aria-hidden="true"
        />
      </button>
    </div>
    <slot name="settings" />
    <div
      class="tooltip"
      :data-tip="t('editor.nav.saveProject')"
    >
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :aria-label="t('editor.nav.saveProject')"
        aria-keyshortcuts="Control+S Meta+S"
        @click="emit('save')"
      >
        <span
          class="mdi mdi-content-save-outline text-xl text-success"
          aria-hidden="true"
        />
      </button>
    </div>
    <AppDropdown
      :label="t('editor.nav.download')"
      align="right"
      panel-role="menu"
    >
      <template #trigger="{ open, panelId }">
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :aria-label="t('editor.nav.download')"
          :title="t('editor.nav.download')"
          aria-haspopup="menu"
          :aria-controls="panelId"
          :aria-expanded="open"
        >
          <span
            class="mdi mdi-download-outline text-xl text-info"
            aria-hidden="true"
          />
        </button>
      </template>
      <template #default="{ close }">
        <ul class="menu w-52 p-2">
          <li>
            <label class="flex-row justify-between gap-3">
              <span>{{ t('editor.print.includeAnnotations') }}</span>
              <input
                class="checkbox checkbox-primary checkbox-sm"
                type="checkbox"
                :checked="includeAnnotations"
                @change="emit('update:includeAnnotations', ($event.target as HTMLInputElement).checked)"
              >
            </label>
          </li>
          <li class="my-1 border-t border-base-300" />
          <li>
            <button
              type="button"
              @click="requestDownload(close, () => emit('png'))"
            >
              <span
                class="mdi mdi-image-outline"
                aria-hidden="true"
              />{{ t('editor.print.canvasPng') }}
            </button>
          </li>
          <li>
            <button
              type="button"
              @click="requestDownload(close, () => emit('print', 'color'))"
            >
              <span
                class="mdi mdi-palette-outline"
                aria-hidden="true"
              />{{ t('editor.print.colorChart') }}
            </button>
          </li>
          <li>
            <button
              type="button"
              @click="requestDownload(close, () => emit('print', 'symbols'))"
            >
              <span
                class="mdi mdi-shape-outline"
                aria-hidden="true"
              />{{ t('editor.print.symbolChart') }}
            </button>
          </li>
        </ul>
      </template>
    </AppDropdown>
  </div>
</template>
