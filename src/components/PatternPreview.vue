<script setup lang="ts">
import { computed } from 'vue'
import type { PatternGrid } from '../types/pattern'
import { repeatGrid } from '../utils/grid'

const props = defineProps<{ cells: PatternGrid; horizontal: number; vertical: number }>()
const preview = computed(() => repeatGrid(props.cells, props.horizontal, props.vertical))
const columns = computed(() => props.cells[0].length * props.horizontal)
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="card-title text-base">Complete pattern preview</h2>
        <div class="flex gap-2">
          <span class="badge badge-primary">{{ columns }} columns</span>
          <span class="badge badge-secondary">{{ preview.length }} rows</span>
        </div>
      </div>
      <div class="max-h-80 overflow-auto border border-base-300 bg-base-100 p-2">
        <div class="grid w-max" :style="{ gridTemplateColumns: `repeat(${columns}, 12px)`, gridAutoRows: '12px' }" aria-label="Repeated pattern preview">
          <template v-for="(row, rowIndex) in preview" :key="rowIndex">
            <span v-for="(color, columnIndex) in row" :key="columnIndex" class="border border-neutral-400/60" :style="{ backgroundColor: color }" aria-hidden="true"></span>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
