<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PaletteEntry, PatternGrid } from '../../../types/pattern'
import { orderedColorCounts } from '../../../utils/palette'
import ColorLegendEntry from './ColorLegendEntry.vue'

const props = defineProps<{
  cells: PatternGrid
  completedCounts?: Record<string, number>
  symbols?: Record<string, string>
  palette?: PaletteEntry[]
  editable?: boolean
  allowColorSwitch?: boolean
  selectable?: boolean
  selectedColor?: string | null
}>()
const emit = defineEmits<{
  update: [color: string, updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>]
  move: [color: string, direction: -1 | 1]
  switchColor: [source: string, target: string]
  reorder: [source: string, target: string, after: boolean]
  selectColor: [color: string]
}>()
const { n, t } = useI18n({ useScope: 'global' })
const entries = computed(() => orderedColorCounts(props.cells, props.palette ?? []))
const legendGridStyle = computed(() => ({
  '--legend-rows': String(Math.max(1, entries.value.length)),
  '--legend-rows-sm': String(Math.max(1, Math.ceil(entries.value.length / 2))),
  '--legend-rows-lg': String(Math.max(1, Math.ceil(entries.value.length / 3))),
}))
const total = computed(() => props.cells.reduce((count, row) => count + row.length, 0))
const completedTotal = computed(() => Object.values(props.completedCounts ?? {}).reduce((count, value) => count + value, 0))
const draggedColor = ref<string | null>(null)
const dropTarget = ref<{ color: string; after: boolean } | null>(null)
const openColor = ref<string | null>(null)

function totalCount(count: number) {
  return t(count === 1 ? 'editor.legend.oneTotal' : 'editor.legend.total', { count: n(count, 'integer') })
}

function progressCount(done: number, count: number) {
  return t('editor.legend.progress', { done: n(done, 'integer'), total: n(count, 'integer') })
}

function setEntryOpen(color: string, open: boolean) {
  if (open) openColor.value = color
  else if (openColor.value === color) openColor.value = null
}

function startDrag(color: string, event: DragEvent) {
  if (!props.editable || !event.dataTransfer) return
  draggedColor.value = color
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', color)
}

function dragOver(color: string, event: DragEvent) {
  if (!props.editable || !draggedColor.value || draggedColor.value === color) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const item = event.currentTarget as HTMLElement
  const bounds = item.querySelector('summary')?.getBoundingClientRect() ?? item.getBoundingClientRect()
  const after = event.clientY >= bounds.top + bounds.height / 2
  const previous = item.previousElementSibling
  if (!after && previous instanceof HTMLElement) {
    const previousBounds = previous.querySelector('summary')?.getBoundingClientRect() ?? previous.getBoundingClientRect()
    if (previous.dataset.color && Math.abs(previousBounds.left - bounds.left) < 1) {
      dropTarget.value = { color: previous.dataset.color, after: true }
      return
    }
  }
  dropTarget.value = { color, after }
}

function drop(color: string, event: DragEvent) {
  if (!props.editable) return
  event.preventDefault()
  const source = draggedColor.value || event.dataTransfer?.getData('text/plain')
  const after = dropTarget.value?.color === color ? dropTarget.value.after : false
  if (source && source !== color) emit('reorder', source, color, after)
  endDrag()
}

function endDrag() {
  draggedColor.value = null
  dropTarget.value = null
}
</script>

<template>
  <section
    class="card relative z-30 border border-base-300 bg-base-100"
    aria-labelledby="color-legend-title"
  >
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="color-legend-title"
            class="card-title text-lg"
          >
            {{ t('editor.legend.title') }}
          </h2>
          <p
            v-if="editable"
            class="mt-1 text-sm text-base-content/65"
          >
            {{ t(allowColorSwitch ? 'controls.palette.description' : 'controls.palette.metadataDescription') }}
          </p>
        </div>
        <span class="badge badge-outline">{{ completedCounts ? progressCount(completedTotal, total) : totalCount(total) }}</span>
      </div>
      <ul
        class="color-legend-list grid grid-flow-col items-start gap-2"
        :style="legendGridStyle"
      >
        <ColorLegendEntry
          v-for="entry in entries"
          :key="entry.color"
          :entry="entry"
          :entries="entries"
          :palette="palette ?? []"
          :symbol="symbols?.[entry.color]"
          :completed-count="completedCounts?.[entry.color] ?? 0"
          :tracks-progress="completedCounts !== undefined"
          :editable="editable ?? false"
          :allow-color-switch="allowColorSwitch ?? false"
          :selectable="selectable ?? false"
          :selected="selectedColor === entry.color"
          :open="openColor === entry.color"
          :dragging="draggedColor === entry.color"
          :drop-indicator="dropTarget?.color === entry.color ? dropTarget.after ? 'after' : 'before' : null"
          @update:open="setEntryOpen(entry.color, $event)"
          @update="emit('update', entry.color, $event)"
          @move="emit('move', entry.color, $event)"
          @switch-color="emit('switchColor', entry.color, $event)"
          @select="emit('selectColor', entry.color)"
          @drag-start="startDrag(entry.color, $event)"
          @drag-over="dragOver(entry.color, $event)"
          @drop="drop(entry.color, $event)"
          @drag-end="endDrag"
        />
      </ul>
    </div>
  </section>
</template>

<style scoped>
.color-legend-list {
  grid-auto-columns: minmax(0, 1fr);
  grid-template-rows: repeat(var(--legend-rows), minmax(0, auto));
}

@media (min-width: 40rem) {
  .color-legend-list {
    grid-template-rows: repeat(var(--legend-rows-sm), minmax(0, auto));
  }
}

@media (min-width: 64rem) {
  .color-legend-list {
    grid-template-rows: repeat(var(--legend-rows-lg), minmax(0, auto));
  }
}
</style>
