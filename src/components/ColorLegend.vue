<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PatternGrid } from '../types/pattern'
import { contrastColor } from '../utils/colors'
import { countColors } from '../utils/grid'

const props = defineProps<{ cells: PatternGrid; completedCounts?: Record<string, number>; symbols?: Record<string, string> }>()
const { n, t } = useI18n({ useScope: 'global' })
const entries = computed(() => countColors(props.cells))
const total = computed(() => props.cells.reduce((count, row) => count + row.length, 0))
const completedTotal = computed(() => Object.values(props.completedCounts ?? {}).reduce((count, value) => count + value, 0))

function stitchCount(count: number) {
  return t(count === 1 ? 'editor.legend.oneStitch' : 'editor.legend.stitches', { count: n(count, 'integer') })
}

function totalCount(count: number) {
  return t(count === 1 ? 'editor.legend.oneTotal' : 'editor.legend.total', { count: n(count, 'integer') })
}

function progressCount(done: number, count: number) {
  return t('editor.legend.progress', { done: n(done, 'integer'), total: n(count, 'integer') })
}

function entryLabel(color: string, stitches: string) {
  const symbol = props.symbols?.[color]
  return t(symbol ? 'editor.legend.entryLabelWithSymbol' : 'editor.legend.entryLabel', { color: color.toUpperCase(), stitches, symbol })
}
</script>

<template>
  <section
    class="card border border-base-300 bg-base-100"
    aria-labelledby="color-legend-title"
  >
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="color-legend-title"
          class="card-title text-lg"
        >
          {{ t('editor.legend.title') }}
        </h2>
        <span class="badge badge-outline">{{ completedCounts ? progressCount(completedTotal, total) : totalCount(total) }}</span>
      </div>
      <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <li
          v-for="entry in entries"
          :key="entry.color"
          class="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/50 px-3 py-2"
          :aria-label="entryLabel(entry.color, completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count))"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-md border border-base-content/25 text-base font-bold leading-none shadow-sm"
            :style="{ backgroundColor: entry.color }"
            aria-hidden="true"
          >
            <span
              v-if="symbols?.[entry.color]"
              :style="{ color: contrastColor(entry.color) }"
            >{{ symbols[entry.color] }}</span>
          </span>
          <code class="min-w-0 text-xs font-semibold">{{ entry.color.toUpperCase() }}</code>
          <span class="ml-auto whitespace-nowrap text-sm tabular-nums text-base-content/70">{{ completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
