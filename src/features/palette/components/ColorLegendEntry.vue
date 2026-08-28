<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDropdown from '../../../shared/ui/AppDropdown.vue'
import type { PaletteEntry } from '../../../types/pattern'
import { contrastColor } from '../../../utils/colors'
import { paletteDetails, paletteLabel, paletteMap } from '../../../utils/palette'
import VisualColorPicker from './VisualColorPicker.vue'

const props = defineProps<{
  entry: { color: string; count: number }
  entries: Array<{ color: string; count: number }>
  palette: PaletteEntry[]
  symbol?: string
  completedCount: number
  tracksProgress: boolean
  editable: boolean
  allowColorSwitch: boolean
  selectable: boolean
  selected: boolean
  open: boolean
  dragging: boolean
  dropIndicator: 'before' | 'after' | null
}>()

const emit = defineEmits<{
  update: [updates: Partial<Pick<PaletteEntry, 'name' | 'brand' | 'code' | 'notes'>>]
  move: [direction: -1 | 1]
  switchColor: [target: string]
  select: []
  'update:open': [open: boolean]
  dragStart: [event: DragEvent]
  dragOver: [event: DragEvent]
  drop: [event: DragEvent]
  dragEnd: []
}>()
const { n, t } = useI18n({ useScope: 'global' })
const metadata = computed(() => paletteMap(props.palette))
const pickerOpen = ref(false)
const draftColor = ref('')
const entryMetadata = computed(() => metadata.value.get(props.entry.color))
const countLabel = computed(() => props.tracksProgress
  ? t('editor.legend.progress', { done: n(props.completedCount, 'integer'), total: n(props.entry.count, 'integer') })
  : t(props.entry.count === 1 ? 'editor.legend.oneStitch' : 'editor.legend.stitches', { count: n(props.entry.count, 'integer') }))
const label = computed(() => {
  const details = [entryMetadata.value?.name, paletteDetails(entryMetadata.value), entryMetadata.value?.notes].filter(Boolean).join(', ')
  const key = props.symbol
    ? details ? 'editor.legend.entryLabelWithSymbolAndMetadata' : 'editor.legend.entryLabelWithSymbol'
    : details ? 'editor.legend.entryLabelWithMetadata' : 'editor.legend.entryLabel'
  return t(key, { color: props.entry.color.toUpperCase(), stitches: countLabel.value, symbol: props.symbol, metadata: details })
})

function updateField(field: 'name' | 'brand' | 'code' | 'notes', event: Event) {
  emit('update', { [field]: (event.target as HTMLInputElement | HTMLTextAreaElement).value })
}

function togglePicker() {
  draftColor.value = props.entry.color
  pickerOpen.value = !pickerOpen.value
}

function switchColor(target: string) {
  pickerOpen.value = false
  emit('update:open', false)
  emit('switchColor', target)
}

function toggleDetails(event: Event) {
  emit('update:open', (event.currentTarget as HTMLDetailsElement).open)
}
</script>

<template>
  <li
    :data-color="entry.color"
    class="relative rounded-box border border-base-300 bg-base-200/50"
    :class="{
      'opacity-50': dragging,
      'ring-2 ring-secondary ring-offset-2 ring-offset-base-100': selected,
    }"
    @dragover="emit('dragOver', $event)"
    @drop="emit('drop', $event)"
  >
    <span
      v-if="dropIndicator"
      class="pointer-events-none absolute inset-x-4 z-20 h-0.5 rounded-full bg-primary"
      :class="dropIndicator === 'after' ? '-bottom-1.25' : '-top-1.25'"
      aria-hidden="true"
    />
    <AppDropdown
      v-if="editable"
      class="w-full"
      :label="label"
      align="left"
      fixed-width
      :open="open"
      panel-class="app-settings-panel w-[min(24rem,calc(100vw-1.5rem))] min-w-0"
      @update:open="emit('update:open', $event)"
    >
      <template #trigger="{ open: dropdownOpen, panelId }">
        <div class="grid min-h-12 w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-left">
          <button
            class="col-span-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left"
            type="button"
            :aria-label="label"
            :aria-pressed="selectable ? selected : undefined"
            :aria-controls="panelId"
            :aria-expanded="dropdownOpen"
            @click="selectable && emit('select')"
          >
            <span
              class="flex size-7 shrink-0 items-center justify-center rounded-md border border-base-content/25 text-base font-bold leading-none shadow-sm"
              :style="{ backgroundColor: entry.color }"
              aria-hidden="true"
            >
              <span
                v-if="symbol"
                :style="{ color: contrastColor(entry.color) }"
              >{{ symbol }}</span>
            </span>
            <span class="min-w-0">
              <strong class="block truncate text-sm">{{ paletteLabel(entryMetadata, entry.color.toUpperCase()) }}</strong>
              <span class="block truncate text-xs text-base-content/60">{{ [entry.color.toUpperCase(), paletteDetails(entryMetadata)].filter(Boolean).join(' · ') }}</span>
            </span>
            <span class="whitespace-nowrap text-sm tabular-nums text-base-content/70">{{ countLabel }}</span>
          </button>
          <button
            class="mdi mdi-drag cursor-grab text-lg text-base-content/45 active:cursor-grabbing"
            type="button"
            draggable="true"
            :aria-label="t('controls.palette.drag', { color: paletteLabel(entryMetadata, entry.color.toUpperCase()) })"
            @click.stop.prevent
            @dragstart.stop="emit('dragStart', $event)"
            @dragend="emit('dragEnd')"
            @keydown.up.prevent="emit('move', -1)"
            @keydown.down.prevent="emit('move', 1)"
          />
        </div>
      </template>
      <label class="app-field w-full">
        <span class="app-field-label">{{ t('controls.palette.name') }}</span>
        <input
          class="input input-bordered input-sm w-full min-w-0"
          type="text"
          maxlength="100"
          :value="entryMetadata?.name"
          @change="updateField('name', $event)"
        >
      </label>
      <label class="app-field w-full">
        <span class="app-field-label">{{ t('controls.palette.brand') }}</span>
        <input
          class="input input-bordered input-sm w-full min-w-0"
          type="text"
          maxlength="100"
          :value="entryMetadata?.brand"
          @change="updateField('brand', $event)"
        >
      </label>
      <label class="app-field w-full">
        <span class="app-field-label">{{ t('controls.palette.code') }}</span>
        <input
          class="input input-bordered input-sm w-full min-w-0"
          type="text"
          maxlength="100"
          :value="entryMetadata?.code"
          @change="updateField('code', $event)"
        >
      </label>
      <label class="app-field w-full">
        <span class="app-field-label">{{ t('controls.palette.notes') }}</span>
        <textarea
          class="textarea textarea-bordered min-h-20 w-full min-w-0 text-sm"
          maxlength="1000"
          :value="entryMetadata?.notes"
          @change="updateField('notes', $event)"
        />
      </label>
      <div
        v-if="allowColorSwitch"
        class="app-settings-section"
      >
        <p class="app-field-label">
          {{ t('controls.palette.switchColor') }}
        </p>
        <div class="flex flex-wrap gap-2 pb-1">
          <button
            class="tooltip tooltip-top z-10 shrink-0 hover:z-20"
            :data-tip="t('controls.palette.chooseNewColor')"
            :title="t('controls.palette.chooseNewColor')"
            type="button"
            :aria-label="t('controls.palette.chooseNewColor')"
            :aria-expanded="pickerOpen"
            @click="togglePicker"
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
            @click="switchColor(target.color)"
          />
        </div>
        <div
          v-if="pickerOpen"
          class="app-inset-panel grid gap-3"
        >
          <VisualColorPicker v-model="draftColor" />
          <div class="flex items-center gap-2">
            <span
              class="size-9 rounded-box border border-base-content/25 shadow-sm"
              :style="{ backgroundColor: draftColor }"
              aria-hidden="true"
            />
            <span class="font-mono text-xs">{{ draftColor.toUpperCase() }}</span>
            <button
              class="btn btn-ghost btn-sm ml-auto"
              type="button"
              @click="pickerOpen = false"
            >
              {{ t('controls.common.cancel') }}
            </button>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              :disabled="draftColor === entry.color"
              @click="switchColor(draftColor)"
            >
              {{ t('controls.palette.applyColor') }}
            </button>
          </div>
        </div>
      </div>
    </AppDropdown>
    <details
      v-else
      :open="open"
      @toggle="toggleDetails"
    >
      <summary
        class="grid min-h-12 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden"
        :aria-label="label"
        :aria-pressed="selectable ? selected : undefined"
        @click="selectable && emit('select')"
      >
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-md border border-base-content/25 text-base font-bold leading-none shadow-sm"
          :style="{ backgroundColor: entry.color }"
          aria-hidden="true"
        >
          <span
            v-if="symbol"
            :style="{ color: contrastColor(entry.color) }"
          >{{ symbol }}</span>
        </span>
        <span class="min-w-0">
          <strong class="block truncate text-sm">{{ paletteLabel(entryMetadata, entry.color.toUpperCase()) }}</strong>
          <span class="block truncate text-xs text-base-content/60">{{ [entry.color.toUpperCase(), paletteDetails(entryMetadata)].filter(Boolean).join(' · ') }}</span>
        </span>
        <span class="whitespace-nowrap text-sm tabular-nums text-base-content/70">{{ countLabel }}</span>
        <span
          class="mdi mdi-chevron-down text-lg text-base-content/45"
          aria-hidden="true"
        />
      </summary>
      <div class="grid gap-3 border-t border-base-300 px-3 py-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <p class="font-semibold">
            {{ paletteLabel(entryMetadata, entry.color.toUpperCase()) }}
          </p>
          <p class="text-sm text-base-content/65">
            {{ [entry.color.toUpperCase(), paletteDetails(entryMetadata)].filter(Boolean).join(' · ') }}
          </p>
          <p
            v-if="entryMetadata?.notes"
            class="mt-2 whitespace-pre-wrap text-sm text-base-content/70"
          >
            {{ entryMetadata.notes }}
          </p>
        </div>
      </div>
    </details>
  </li>
</template>
