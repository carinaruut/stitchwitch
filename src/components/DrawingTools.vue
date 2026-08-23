<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DrawingTool, PrintMode } from '../types/pattern'
import AppDropdown from './AppDropdown.vue'

defineProps<{
  tool: DrawingTool
  placingSelection: boolean
  mirrorHorizontal: boolean
  mirrorVertical: boolean
  referenceOpen: boolean
  includeAnnotations: boolean
}>()
defineEmits<{
  select: [tool: DrawingTool]
  clear: []
  save: []
  png: []
  print: [mode: PrintMode]
  toggleMirrorHorizontal: []
  toggleMirrorVertical: []
  toggleReference: []
  cancelPlacement: []
  'update:includeAnnotations': [value: boolean]
}>()

const { t } = useI18n({ useScope: 'global' })
const tools = computed<Array<{ value: DrawingTool; icon: string; label: string; shortcut: string }>>(() => [
  { value: 'pencil', icon: 'mdi-pencil', label: t('controls.drawing.tools.pencil'), shortcut: 'P' },
  { value: 'eraser', icon: 'mdi-eraser', label: t('controls.drawing.tools.eraser'), shortcut: 'E' },
  { value: 'fill', icon: 'mdi-format-color-fill', label: t('controls.drawing.tools.fill'), shortcut: 'F' },
  { value: 'eyedropper', icon: 'mdi-eyedropper', label: t('controls.drawing.tools.eyedropper'), shortcut: 'I' },
  { value: 'select', icon: 'mdi-select-drag', label: t('controls.drawing.tools.select'), shortcut: 'S' },
  { value: 'wand', icon: 'mdi-auto-fix', label: t('controls.drawing.tools.wand'), shortcut: 'W' },
  { value: 'move', icon: 'mdi-hand-back-right-outline', label: t('controls.drawing.tools.move'), shortcut: 'H' },
  { value: 'text', icon: 'mdi-format-text', label: t('controls.drawing.tools.text'), shortcut: 'T' },
  { value: 'marker', icon: 'mdi-map-marker-outline', label: t('controls.drawing.tools.marker'), shortcut: 'M' },
  { value: 'arrow', icon: 'mdi-arrow-top-right', label: t('controls.drawing.tools.arrow'), shortcut: 'A' },
])

function requestDownload(close: (focusAnchor?: boolean) => void, action: () => void) {
  close(true)
  action()
}
</script>

<template>
  <section
    class="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-200/70 p-1.5"
    :aria-label="t('controls.drawing.regionLabel')"
  >
    <div
      class="flex flex-wrap gap-1"
      :aria-label="t('controls.drawing.selectionLabel')"
    >
      <slot name="color" />
      <div
        v-for="item in tools"
        :key="item.value"
        class="tooltip"
        :data-tip="t('controls.drawing.toolTooltip', { label: item.label, shortcut: item.shortcut })"
      >
        <button
          class="btn btn-sm"
          :class="tool === item.value ? 'btn-primary' : 'btn-ghost'"
          type="button"
          :aria-label="t('controls.drawing.toolTooltip', { label: item.label, shortcut: item.shortcut })"
          :aria-keyshortcuts="item.shortcut"
          :aria-pressed="tool === item.value"
          @click="$emit('select', item.value)"
        >
          <span
            class="mdi text-xl"
            :class="item.icon"
            aria-hidden="true"
          /><span class="sr-only">{{ item.label }}</span>
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('controls.drawing.clearGrid')"
      >
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          :aria-label="t('controls.drawing.clearGrid')"
          @click="$emit('clear')"
        >
          <span
            class="mdi mdi-delete-sweep-outline text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <slot name="controls" />
    </div>
    <div
      class="flex gap-1"
      :aria-label="t('controls.drawing.mirrorLines')"
    >
      <div
        class="tooltip"
        :data-tip="t('controls.drawing.verticalMirrorTooltip')"
      >
        <button
          class="btn btn-sm"
          :class="mirrorVertical ? 'btn-primary' : 'btn-ghost'"
          type="button"
          :aria-label="t('controls.drawing.toggleVerticalMirror')"
          :aria-pressed="mirrorVertical"
          @click="$emit('toggleMirrorVertical')"
        >
          <span
            class="mdi mdi-flip-horizontal text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        class="tooltip"
        :data-tip="t('controls.drawing.horizontalMirrorTooltip')"
      >
        <button
          class="btn btn-sm"
          :class="mirrorHorizontal ? 'btn-primary' : 'btn-ghost'"
          type="button"
          :aria-label="t('controls.drawing.toggleHorizontalMirror')"
          :aria-pressed="mirrorHorizontal"
          @click="$emit('toggleMirrorHorizontal')"
        >
          <span
            class="mdi mdi-flip-vertical text-xl"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
    <div
      v-if="placingSelection"
      class="flex items-center gap-1 border-l border-base-300 pl-3"
    >
      <span class="text-xs font-medium text-primary">{{ t('controls.drawing.chooseDestination') }}</span>
      <button
        class="btn btn-ghost btn-xs"
        type="button"
        @click="$emit('cancelPlacement')"
      >
        {{ t('controls.common.cancel') }}
      </button>
    </div>
    <div
      class="tooltip"
      :data-tip="t('controls.reference.toggle')"
    >
      <button
        class="btn btn-sm"
        :class="referenceOpen ? 'btn-primary' : 'btn-ghost'"
        type="button"
        :aria-label="t('controls.reference.toggle')"
        :aria-pressed="referenceOpen"
        @click="$emit('toggleReference')"
      >
        <span
          class="mdi mdi-image-outline text-xl"
          aria-hidden="true"
        />
      </button>
    </div>
    <div
      v-if="$slots.settings"
      class="flex w-full shrink-0 items-center justify-start gap-1 border-t border-base-300 pt-1 lg:ml-auto lg:w-auto lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0"
      :aria-label="t('controls.drawing.patternSettings')"
    >
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
          @click="$emit('save')"
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
                  @change="$emit('update:includeAnnotations', ($event.target as HTMLInputElement).checked)"
                >
              </label>
            </li>
            <li class="my-1 border-t border-base-300" />
            <li>
              <button
                type="button"
                @click="requestDownload(close, () => $emit('png'))"
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
                @click="requestDownload(close, () => $emit('print', 'color'))"
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
                @click="requestDownload(close, () => $emit('print', 'symbols'))"
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
  </section>
</template>
