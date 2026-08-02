<script setup lang="ts">
import type { DrawingTool } from '../types/pattern'

defineProps<{ tool: DrawingTool }>()
defineEmits<{ select: [tool: DrawingTool]; clear: [] }>()

const tools: Array<{ value: DrawingTool; icon: string; label: string }> = [
  { value: 'pencil', icon: 'mdi-pencil', label: 'Pencil' },
  { value: 'eraser', icon: 'mdi-eraser', label: 'Eraser' },
  { value: 'eyedropper', icon: 'mdi-eyedropper', label: 'Eyedropper' },
  { value: 'move', icon: 'mdi-cursor-move', label: 'Move canvas' },
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
      <span class="badge badge-sm badge-outline capitalize">{{ tool }}</span>
  </section>
</template>
