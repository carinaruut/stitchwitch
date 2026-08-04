<script setup lang="ts">
import type { DrawingTool } from '../types/pattern'

defineProps<{
  tool: DrawingTool
  canCopy: boolean
  canPaste: boolean
  placingSelection: boolean
  mirrorHorizontal: boolean
  mirrorVertical: boolean
}>()
defineEmits<{
  select: [tool: DrawingTool]
  clear: []
  copy: []
  paste: []
  moveSelection: []
  mirrorHorizontal: []
  mirrorVertical: []
  toggleMirrorHorizontal: []
  toggleMirrorVertical: []
  cancelPlacement: []
}>()

const tools: Array<{ value: DrawingTool; icon: string; label: string }> = [
  { value: 'pencil', icon: 'mdi-pencil', label: 'Pencil' },
  { value: 'eraser', icon: 'mdi-eraser', label: 'Eraser' },
  { value: 'eyedropper', icon: 'mdi-eyedropper', label: 'Eyedropper' },
  { value: 'select', icon: 'mdi-select-drag', label: 'Select area' },
  { value: 'move', icon: 'mdi-hand-back-right-outline', label: 'Pan canvas' },
]
</script>

<template>
  <section class="flex flex-wrap items-center gap-3 border-y border-base-300 py-2" aria-label="Drawing tools">
      <span class="text-sm font-semibold">Tools</span>
      <div class="join" aria-label="Drawing tool selection">
        <div v-for="item in tools" :key="item.value" class="tooltip" :data-tip="item.label">
          <button
            class="btn btn-sm join-item"
            :class="tool === item.value ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-label="item.label"
            :aria-pressed="tool === item.value"
            @click="$emit('select', item.value)"
          >
            <span class="mdi text-lg" :class="item.icon" aria-hidden="true"></span><span class="sr-only">{{ item.label }}</span>
          </button>
        </div>
        <div class="tooltip" data-tip="Clear grid">
          <button class="btn btn-sm btn-ghost join-item" type="button" aria-label="Clear grid" @click="$emit('clear')"><span class="mdi mdi-delete-sweep-outline text-lg" aria-hidden="true"></span></button>
        </div>
      </div>
      <div class="join" aria-label="Live canvas mirror lines">
        <div class="tooltip" data-tip="Vertical mirror line: draw left and right">
          <button class="btn btn-sm join-item" :class="mirrorVertical ? 'btn-secondary' : 'btn-ghost'" type="button" aria-label="Toggle vertical mirror line" :aria-pressed="mirrorVertical" @click="$emit('toggleMirrorVertical')"><span class="mdi mdi-flip-horizontal text-lg" aria-hidden="true"></span><span class="hidden xl:inline">Vertical</span></button>
        </div>
        <div class="tooltip" data-tip="Horizontal mirror line: draw top and bottom">
          <button class="btn btn-sm join-item" :class="mirrorHorizontal ? 'btn-secondary' : 'btn-ghost'" type="button" aria-label="Toggle horizontal mirror line" :aria-pressed="mirrorHorizontal" @click="$emit('toggleMirrorHorizontal')"><span class="mdi mdi-flip-vertical text-lg" aria-hidden="true"></span><span class="hidden xl:inline">Horizontal</span></button>
        </div>
      </div>
      <div v-if="tool === 'select'" class="flex items-center gap-1 border-l border-base-300 pl-3">
        <template v-if="placingSelection">
          <span class="text-xs font-medium text-primary">Choose destination</span>
          <button class="btn btn-ghost btn-xs" type="button" @click="$emit('cancelPlacement')">Cancel</button>
        </template>
        <template v-else>
          <button class="btn btn-ghost btn-xs" type="button" :disabled="!canCopy" @click="$emit('moveSelection')"><span class="mdi mdi-cursor-move" aria-hidden="true"></span>Move</button>
          <button class="btn btn-ghost btn-xs" type="button" :disabled="!canCopy" @click="$emit('copy')"><span class="mdi mdi-content-copy" aria-hidden="true"></span>Copy</button>
          <button class="btn btn-ghost btn-xs" type="button" :disabled="!canPaste" @click="$emit('paste')"><span class="mdi mdi-content-paste" aria-hidden="true"></span>Paste</button>
          <div class="tooltip" data-tip="Flip horizontally">
            <button class="btn btn-ghost btn-xs btn-square" type="button" :disabled="!canCopy" aria-label="Flip selection horizontally" @click="$emit('mirrorHorizontal')"><span class="mdi mdi-flip-horizontal" aria-hidden="true"></span></button>
          </div>
          <div class="tooltip" data-tip="Flip vertically">
            <button class="btn btn-ghost btn-xs btn-square" type="button" :disabled="!canCopy" aria-label="Flip selection vertically" @click="$emit('mirrorVertical')"><span class="mdi mdi-flip-vertical" aria-hidden="true"></span></button>
          </div>
        </template>
      </div>
      <span class="badge badge-sm badge-outline capitalize">{{ tool === 'move' ? 'pan' : tool }}</span>
  </section>
</template>
