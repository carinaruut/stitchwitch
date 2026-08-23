<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PaletteEntry, PatternGrid } from '../types/pattern'
import { contrastColor } from '../utils/colors'
import { orderedColorCounts, paletteDetails, paletteLabel, paletteMap } from '../utils/palette'
import AppDropdown from './AppDropdown.vue'
import VisualColorPicker from './VisualColorPicker.vue'

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
const entries = computed(() => {
  const counted = orderedColorCounts(props.cells, props.palette ?? [])
  if (!props.editable) return counted
  const counts = new Map(counted.map((entry) => [entry.color, entry.count]))
  const paletteEntries = (props.palette ?? []).map((entry) => ({ color: entry.color, count: counts.get(entry.color) ?? 0 }))
  const known = new Set(paletteEntries.map((entry) => entry.color))
  return [...paletteEntries, ...counted.filter((entry) => !known.has(entry.color))]
})
const legendGridStyle = computed(() => ({
  '--legend-rows': String(Math.max(1, entries.value.length)),
  '--legend-rows-sm': String(Math.max(1, Math.ceil(entries.value.length / 2))),
  '--legend-rows-lg': String(Math.max(1, Math.ceil(entries.value.length / 3))),
}))
const metadata = computed(() => paletteMap(props.palette ?? []))
const total = computed(() => props.cells.reduce((count, row) => count + row.length, 0))
const completedTotal = computed(() => Object.values(props.completedCounts ?? {}).reduce((count, value) => count + value, 0))
const draggedColor = ref<string | null>(null)
const dropTarget = ref<{ color: string; after: boolean } | null>(null)
const openColor = ref<string | null>(null)
const pickerSource = ref<string | null>(null)
const draftColor = ref('')

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
  const entry = metadata.value.get(color)
  const details = [entry?.name, paletteDetails(entry), entry?.notes].filter(Boolean).join(', ')
  const key = symbol
    ? details ? 'editor.legend.entryLabelWithSymbolAndMetadata' : 'editor.legend.entryLabelWithSymbol'
    : details ? 'editor.legend.entryLabelWithMetadata' : 'editor.legend.entryLabel'
  return t(key, { color: color.toUpperCase(), stitches, symbol, metadata: details })
}

function updateField(color: string, field: 'name' | 'brand' | 'code' | 'notes', event: Event) {
  emit('update', color, { [field]: (event.target as HTMLInputElement | HTMLTextAreaElement).value })
}

function openPicker(source: string) {
  draftColor.value = source
  pickerSource.value = pickerSource.value === source ? null : source
}

function switchColor(source: string, target: string) {
  openColor.value = null
  pickerSource.value = null
  emit('switchColor', source, target)
}

function toggleEntry(color: string, event: Event) {
  const details = event.currentTarget as HTMLDetailsElement
  if (details.open) openColor.value = color
  else if (openColor.value === color) openColor.value = null
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
        <li
          v-for="entry in entries"
          :key="entry.color"
          :data-color="entry.color"
          class="relative rounded-box border border-base-300 bg-base-200/50"
          :class="{
            'opacity-50': draggedColor === entry.color,
            'ring-2 ring-secondary ring-offset-2 ring-offset-base-100': selectedColor === entry.color,
          }"
          @dragover="dragOver(entry.color, $event)"
          @drop="drop(entry.color, $event)"
        >
          <span
            v-if="dropTarget?.color === entry.color"
            class="pointer-events-none absolute inset-x-4 z-20 h-0.5 rounded-full bg-primary"
            :class="dropTarget.after ? '-bottom-[5px]' : '-top-[5px]'"
            aria-hidden="true"
          />
          <AppDropdown
            v-if="editable"
            class="w-full"
            :label="entryLabel(entry.color, completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count))"
            align="left"
            :open="openColor === entry.color"
            panel-class="flex w-[min(24rem,calc(100vw-1.5rem))] min-w-0 flex-col gap-3 p-4"
            @update:open="setEntryOpen(entry.color, $event)"
          >
            <template #trigger="{ open, panelId }">
              <div
                class="grid min-h-12 w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-left"
              >
                <button
                  class="col-span-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left"
                  type="button"
                  :aria-label="entryLabel(entry.color, completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count))"
                  :aria-pressed="selectable ? selectedColor === entry.color : undefined"
                  :aria-controls="panelId"
                  :aria-expanded="open"
                  @click="selectable && emit('selectColor', entry.color)"
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
                  <span class="min-w-0">
                    <strong class="block truncate text-sm">{{ paletteLabel(metadata.get(entry.color), entry.color.toUpperCase()) }}</strong>
                    <span class="block truncate text-xs text-base-content/60">
                      {{ [entry.color.toUpperCase(), paletteDetails(metadata.get(entry.color))].filter(Boolean).join(' · ') }}
                    </span>
                  </span>
                  <span class="whitespace-nowrap text-sm tabular-nums text-base-content/70">{{ completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count) }}</span>
                </button>
                <button
                  class="mdi mdi-drag cursor-grab text-lg text-base-content/45 active:cursor-grabbing"
                  type="button"
                  draggable="true"
                  :aria-label="t('controls.palette.drag', { color: paletteLabel(metadata.get(entry.color), entry.color.toUpperCase()) })"
                  @click.stop.prevent
                  @dragstart.stop="startDrag(entry.color, $event)"
                  @dragend="endDrag"
                  @keydown.up.prevent="emit('move', entry.color, -1)"
                  @keydown.down.prevent="emit('move', entry.color, 1)"
                />
              </div>
            </template>
            <template #default>
              <label class="flex w-full min-w-0 flex-col items-stretch gap-1">
                <span class="text-xs font-semibold">{{ t('controls.palette.name') }}</span>
                <input
                  class="input input-bordered input-sm w-full min-w-0"
                  type="text"
                  maxlength="100"
                  :value="metadata.get(entry.color)?.name"
                  @change="updateField(entry.color, 'name', $event)"
                >
              </label>
              <label class="flex w-full min-w-0 flex-col items-stretch gap-1">
                <span class="text-xs font-semibold">{{ t('controls.palette.brand') }}</span>
                <input
                  class="input input-bordered input-sm w-full min-w-0"
                  type="text"
                  maxlength="100"
                  :value="metadata.get(entry.color)?.brand"
                  @change="updateField(entry.color, 'brand', $event)"
                >
              </label>
              <label class="flex w-full min-w-0 flex-col items-stretch gap-1">
                <span class="text-xs font-semibold">{{ t('controls.palette.code') }}</span>
                <input
                  class="input input-bordered input-sm w-full min-w-0"
                  type="text"
                  maxlength="100"
                  :value="metadata.get(entry.color)?.code"
                  @change="updateField(entry.color, 'code', $event)"
                >
              </label>
              <label class="flex w-full min-w-0 flex-col items-stretch gap-1">
                <span class="text-xs font-semibold">{{ t('controls.palette.notes') }}</span>
                <textarea
                  class="textarea textarea-bordered min-h-20 w-full min-w-0 text-sm"
                  maxlength="1000"
                  :value="metadata.get(entry.color)?.notes"
                  @change="updateField(entry.color, 'notes', $event)"
                />
              </label>
              <div
                v-if="allowColorSwitch"
                class="border-t border-base-300 pt-3"
              >
                <p class="mb-2 text-xs font-semibold">
                  {{ t('controls.palette.switchColor') }}
                </p>
                <div class="flex flex-wrap gap-2 pb-1">
                  <button
                    class="tooltip tooltip-top z-10 shrink-0 hover:z-20"
                    :data-tip="t('controls.palette.chooseNewColor')"
                    :title="t('controls.palette.chooseNewColor')"
                    type="button"
                    :aria-label="t('controls.palette.chooseNewColor')"
                    :aria-expanded="pickerSource === entry.color"
                    @click="openPicker(entry.color)"
                  >
                    <span class="grid size-12 cursor-pointer place-items-center rounded-box border-2 border-dashed border-base-content/35 bg-base-200 text-base-content/70 transition-colors hover:border-primary hover:text-primary">
                      <span
                        class="mdi mdi-plus text-2xl"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  <button
                    v-for="target in entries.filter((candidate) => candidate.color !== entry.color)"
                    :key="target.color"
                    class="tooltip tooltip-top z-10 size-12 shrink-0 rounded-box border border-base-content/25 shadow-sm transition-transform hover:z-20 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary"
                    type="button"
                    :style="{ backgroundColor: target.color }"
                    :data-tip="paletteLabel(metadata.get(target.color), target.color.toUpperCase())"
                    :title="paletteLabel(metadata.get(target.color), target.color.toUpperCase())"
                    :aria-label="t('controls.palette.switchTo', { color: paletteLabel(metadata.get(target.color), target.color.toUpperCase()) })"
                    @click="switchColor(entry.color, target.color)"
                  />
                </div>
                <div
                  v-if="pickerSource === entry.color"
                  class="mt-3 rounded-box border border-base-300 bg-base-200/40 p-3"
                >
                  <VisualColorPicker v-model="draftColor" />
                  <div class="mt-3 flex items-center gap-2">
                    <span
                      class="size-9 rounded-box border border-base-content/25 shadow-sm"
                      :style="{ backgroundColor: draftColor }"
                      aria-hidden="true"
                    />
                    <span class="font-mono text-xs">{{ draftColor.toUpperCase() }}</span>
                    <button
                      class="btn btn-ghost btn-sm ml-auto"
                      type="button"
                      @click="pickerSource = null"
                    >
                      {{ t('controls.common.cancel') }}
                    </button>
                    <button
                      class="btn btn-primary btn-sm"
                      type="button"
                      :disabled="draftColor === entry.color"
                      @click="switchColor(entry.color, draftColor)"
                    >
                      {{ t('controls.palette.applyColor') }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </AppDropdown>
          <details
            v-else
            :open="openColor === entry.color"
            @toggle="toggleEntry(entry.color, $event)"
          >
            <summary
              class="grid min-h-12 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden"
              :aria-label="entryLabel(entry.color, completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count))"
              :aria-pressed="selectable ? selectedColor === entry.color : undefined"
              @click="selectable && emit('selectColor', entry.color)"
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
              <span class="min-w-0">
                <strong class="block truncate text-sm">{{ paletteLabel(metadata.get(entry.color), entry.color.toUpperCase()) }}</strong>
                <span class="block truncate text-xs text-base-content/60">
                  {{ [entry.color.toUpperCase(), paletteDetails(metadata.get(entry.color))].filter(Boolean).join(' · ') }}
                </span>
              </span>
              <span class="whitespace-nowrap text-sm tabular-nums text-base-content/70">{{ completedCounts ? progressCount(completedCounts[entry.color] ?? 0, entry.count) : stitchCount(entry.count) }}</span>
              <span
                class="mdi mdi-chevron-down text-lg text-base-content/45"
                aria-hidden="true"
              />
            </summary>
            <div class="grid gap-3 border-t border-base-300 px-3 py-3 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <p class="font-semibold">
                  {{ paletteLabel(metadata.get(entry.color), entry.color.toUpperCase()) }}
                </p>
                <p class="text-sm text-base-content/65">
                  {{ [entry.color.toUpperCase(), paletteDetails(metadata.get(entry.color))].filter(Boolean).join(' · ') }}
                </p>
                <p
                  v-if="metadata.get(entry.color)?.notes"
                  class="mt-2 whitespace-pre-wrap text-sm text-base-content/70"
                >
                  {{ metadata.get(entry.color)?.notes }}
                </p>
              </div>
            </div>
          </details>
        </li>
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
