<script setup lang="ts">
import type { DrawingTool } from '../types/pattern'

defineProps<{ tool: DrawingTool }>()
defineEmits<{ select: [tool: DrawingTool]; clear: [] }>()

const tools: Array<{ value: DrawingTool; symbol: string; label: string }> = [
  { value: 'pencil', symbol: 'P', label: 'Pencil' },
  { value: 'eraser', symbol: 'E', label: 'Eraser' },
  { value: 'eyedropper', symbol: 'I', label: 'Eyedropper' },
]
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <h2 class="card-title text-base">Drawing tools</h2>
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
            <span aria-hidden="true">{{ item.symbol }}</span><span class="sr-only">{{ item.label }}</span>
          </button>
        </div>
        <div class="tooltip" data-tip="Clear grid">
          <button class="btn btn-sm btn-ghost join-item" type="button" aria-label="Clear grid" @click="$emit('clear')">C</button>
        </div>
      </div>
      <p class="text-xs text-base-content/70">Active: <strong class="capitalize">{{ tool }}</strong></p>
    </div>
  </section>
</template>
