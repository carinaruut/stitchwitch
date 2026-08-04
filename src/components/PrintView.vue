<script setup lang="ts">
import { computed } from 'vue'
import type { PatternProject } from '../types/pattern'
import { findUsedColors, renderGrid } from '../utils/grid'

const props = defineProps<{ project: PatternProject }>()
const repeated = computed(() => renderGrid(props.project.cells, props.project.horizontalRepeats, props.project.verticalRepeats, props.project.repeatBoxes).cells)
const columns = computed(() => repeated.value[0].length)
const usedColors = computed(() => findUsedColors(repeated.value))
</script>

<template>
  <article class="print-only hidden bg-white text-black">
    <h1 class="mb-1 text-2xl font-bold">{{ project.name }}</h1>
    <p class="mb-5">{{ columns }} columns by {{ repeated.length }} rows</p>
    <div class="inline-grid" :style="{ gridTemplateColumns: `24px repeat(${columns}, minmax(5px, 1fr))`, gridTemplateRows: `24px repeat(${repeated.length}, minmax(5px, 1fr))` }">
      <span></span>
      <span v-for="column in columns" :key="`column-${column}`" class="flex items-center justify-center text-[7px]">{{ column }}</span>
      <template v-for="(row, rowIndex) in repeated" :key="rowIndex">
        <span class="flex items-center justify-center text-[7px]">{{ rowIndex + 1 }}</span>
        <span v-for="(color, columnIndex) in row" :key="columnIndex" class="aspect-square border border-black" :style="{ backgroundColor: color }"></span>
      </template>
    </div>
    <section class="mt-5 break-inside-avoid">
      <h2 class="mb-2 text-lg font-bold">Used colors</h2>
      <ul class="flex flex-wrap gap-4">
        <li v-for="color in usedColors" :key="color" class="flex items-center gap-2">
          <span class="h-5 w-5 border border-black" :style="{ backgroundColor: color }"></span>{{ color }}
        </li>
      </ul>
    </section>
  </article>
</template>
