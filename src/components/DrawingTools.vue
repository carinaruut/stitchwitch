<script setup lang="ts">
import type { DrawingTool } from '../types/pattern'

defineProps<{
  tool: DrawingTool
  placingSelection: boolean
  mirrorHorizontal: boolean
  mirrorVertical: boolean
}>()
defineEmits<{
  select: [tool: DrawingTool]
  clear: []
  toggleMirrorHorizontal: []
  toggleMirrorVertical: []
  cancelPlacement: []
}>()

const tools: Array<{ value: DrawingTool; icon: string; label: string; shortcut: string }> = [
  { value: 'pencil', icon: 'mdi-pencil', label: 'Pencil', shortcut: 'P' },
  { value: 'eraser', icon: 'mdi-eraser', label: 'Eraser', shortcut: 'E' },
  { value: 'fill', icon: 'mdi-format-color-fill', label: 'Fill', shortcut: 'F' },
  { value: 'eyedropper', icon: 'mdi-eyedropper', label: 'Eyedropper', shortcut: 'I' },
  { value: 'select', icon: 'mdi-select-drag', label: 'Select area', shortcut: 'S' },
  { value: 'wand', icon: 'mdi-auto-fix', label: 'Magic wand', shortcut: 'W' },
  { value: 'move', icon: 'mdi-hand-back-right-outline', label: 'Pan canvas', shortcut: 'H' },
]
</script>

<template>
  <section class="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-200/70 p-1.5" aria-label="Editor tools">
      <span class="text-sm font-semibold">Tools</span>
      <div class="flex flex-wrap gap-1" aria-label="Drawing tool selection">
        <div v-for="item in tools" :key="item.value" class="tooltip" :data-tip="`${item.label} (${item.shortcut})`">
          <button
            class="btn btn-sm"
            :class="tool === item.value ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-label="`${item.label} (${item.shortcut})`"
            :aria-keyshortcuts="item.shortcut"
            :aria-pressed="tool === item.value"
            @click="$emit('select', item.value)"
          >
            <span class="mdi text-lg" :class="item.icon" aria-hidden="true"></span><span class="sr-only">{{ item.label }}</span>
          </button>
        </div>
        <div class="tooltip" data-tip="Clear grid">
          <button class="btn btn-sm btn-ghost" type="button" aria-label="Clear grid" @click="$emit('clear')"><span class="mdi mdi-delete-sweep-outline text-lg" aria-hidden="true"></span></button>
        </div>
      </div>
      <div class="flex gap-1" aria-label="Live canvas mirror lines">
        <div class="tooltip" data-tip="Vertical mirror line: draw left and right">
          <button class="btn btn-sm" :class="mirrorVertical ? 'btn-secondary' : 'btn-ghost'" type="button" aria-label="Toggle vertical mirror line" :aria-pressed="mirrorVertical" @click="$emit('toggleMirrorVertical')"><span class="mdi mdi-flip-horizontal text-lg" aria-hidden="true"></span><span class="hidden xl:inline">Vertical</span></button>
        </div>
        <div class="tooltip" data-tip="Horizontal mirror line: draw top and bottom">
          <button class="btn btn-sm" :class="mirrorHorizontal ? 'btn-secondary' : 'btn-ghost'" type="button" aria-label="Toggle horizontal mirror line" :aria-pressed="mirrorHorizontal" @click="$emit('toggleMirrorHorizontal')"><span class="mdi mdi-flip-vertical text-lg" aria-hidden="true"></span><span class="hidden xl:inline">Horizontal</span></button>
        </div>
      </div>
      <div v-if="placingSelection" class="flex items-center gap-1 border-l border-base-300 pl-3">
        <span class="text-xs font-medium text-primary">Choose destination</span>
        <button class="btn btn-ghost btn-xs" type="button" @click="$emit('cancelPlacement')">Cancel</button>
      </div>
      <div v-if="$slots.settings" class="flex w-full shrink-0 items-center justify-start gap-1 border-t border-base-300 pt-1 lg:ml-auto lg:w-auto lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0" aria-label="Pattern settings">
        <slot name="settings"></slot>
      </div>
  </section>
</template>
