<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DrawingTool } from '../../../../types/pattern'

defineProps<{
  tool: DrawingTool
  placingSelection: boolean
  mirrorHorizontal: boolean
  mirrorVertical: boolean
  referenceOpen: boolean
}>()
defineEmits<{
  select: [tool: DrawingTool]
  clear: []
  toggleMirrorHorizontal: []
  toggleMirrorVertical: []
  toggleReference: []
  cancelPlacement: []
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
  { value: 'text', icon: 'mdi-comment-plus-outline', label: t('controls.drawing.tools.text'), shortcut: 'T' },
  { value: 'marker', icon: 'mdi-map-marker-outline', label: t('controls.drawing.tools.marker'), shortcut: 'M' },
  { value: 'arrow', icon: 'mdi-arrow-top-right', label: t('controls.drawing.tools.arrow'), shortcut: 'A' },
])

</script>

<template>
  <section
    class="app-toolbar rounded-box border border-base-300 bg-base-200/70"
    role="toolbar"
    :aria-label="t('controls.drawing.regionLabel')"
  >
    <div
      class="flex flex-wrap gap-1"
      role="group"
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
      role="group"
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
    <slot name="actions" />
  </section>
</template>
