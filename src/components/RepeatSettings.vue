<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RepeatBox, RepeatBoxInput, RepeatDirection } from '../types/pattern'

const props = defineProps<{
  horizontal: number
  vertical: number
  boxes: RepeatBox[]
  selectedRow: number
  rowCount: number
  selectedColumn: number
  columnCount: number
}>()

const emit = defineEmits<{
  horizontal: [value: number]
  vertical: [value: number]
  save: [input: RepeatBoxInput, id: string | null]
  toggle: [id: string, enabled: boolean]
  remove: [id: string]
}>()

type SizingMode = 'boundary' | 'size'

const direction = ref<RepeatDirection>('across')
const sizingMode = ref<SizingMode>('size')
const firstCross = ref(1)
const lastCross = ref(1)
const start = ref(1)
const ending = ref(3)
const sectionSize = ref(1)
const sections = ref(2)
const editingId = ref<string | null>(null)
const editingEnabled = ref(true)

function selectedDefaults() {
  if (direction.value === 'across') {
    firstCross.value = props.selectedRow + 1
    lastCross.value = props.selectedRow + 1
    start.value = props.selectedColumn + 1
  } else {
    firstCross.value = props.selectedColumn + 1
    lastCross.value = props.selectedColumn + 1
    start.value = props.selectedRow + 1
  }
  sectionSize.value = 1
  sections.value = 2
  ending.value = start.value + 2
}

watch(
  () => [direction.value, props.selectedRow, props.selectedColumn] as const,
  () => {
    if (editingId.value === null) selectedDefaults()
  },
  { immediate: true },
)

const values = computed(() => ({
  firstCross: Number(firstCross.value),
  lastCross: Number(lastCross.value),
  start: Number(start.value),
  ending: Number(ending.value),
  sectionSize: Number(sectionSize.value),
  sections: Number(sections.value),
}))

const totalLength = computed(() => {
  const value = values.value
  return sizingMode.value === 'boundary'
    ? value.ending - value.start
    : value.sectionSize * value.sections
})

const validationMessage = computed(() => {
  const value = values.value
  const coordinates = [value.firstCross, value.lastCross, value.start]
  if (sizingMode.value === 'boundary') coordinates.push(value.ending)
  else coordinates.push(value.sectionSize)

  if (!coordinates.every((item) => Number.isInteger(item) && item > 0)) {
    return 'Coordinates and sizes must be positive whole numbers.'
  }
  if (!Number.isInteger(value.sections) || value.sections < 2 || value.sections > 20) {
    return 'Sections must be a whole number from 2 to 20.'
  }
  if (value.lastCross < value.firstCross) {
    return direction.value === 'across'
      ? 'Bottom row must be at or below the top row.'
      : 'Right column must be at or after the left column.'
  }

  if (value.lastCross > 500 || value.start > 500) {
    return 'Repeat boxes cannot extend beyond 500 rows or columns.'
  }
  if (totalLength.value <= 0 || value.start - 1 + totalLength.value > 500) {
    return 'The repeat box must end after its start and stay within 500 rows or columns.'
  }
  if (sizingMode.value === 'boundary' && totalLength.value % value.sections !== 0) {
    return 'The repeat length must divide evenly by the number of sections.'
  }
  return ''
})

const input = computed<RepeatBoxInput | null>(() => {
  if (validationMessage.value) return null
  const value = values.value
  const end = value.start - 1 + totalLength.value

  if (direction.value === 'across') {
    return {
      direction: 'across',
      top: value.firstCross - 1,
      bottom: value.lastCross,
      left: value.start - 1,
      right: end,
      sections: value.sections,
      enabled: editingEnabled.value,
    }
  }
  return {
    direction: 'down',
    top: value.start - 1,
    bottom: end,
    left: value.firstCross - 1,
    right: value.lastCross,
    sections: value.sections,
    enabled: editingEnabled.value,
  }
})

function summary(box: RepeatBoxInput) {
  const sectionLength = box.direction === 'across'
    ? (box.right - box.left) / box.sections
    : (box.bottom - box.top) / box.sections
  const unit = box.direction === 'across' ? 'columns' : 'rows'
  return `Rows ${box.top + 1}-${box.bottom}, Columns ${box.left + 1}-${box.right}, ${box.sections} sections, ${sectionLength} ${unit} each.`
}

const liveSummary = computed(() => input.value ? summary(input.value) : '')

function sourceSize(box: RepeatBox) {
  const rows = box.direction === 'down' ? (box.bottom - box.top) / box.sections : box.bottom - box.top
  const columns = box.direction === 'across' ? (box.right - box.left) / box.sections : box.right - box.left
  return `${rows} ${rows === 1 ? 'row' : 'rows'} x ${columns} ${columns === 1 ? 'column' : 'columns'}`
}

function submit() {
  if (!input.value) return
  emit('save', input.value, editingId.value)
  cancelEdit()
}

function edit(box: RepeatBox) {
  editingId.value = box.id
  editingEnabled.value = box.enabled
  direction.value = box.direction
  sizingMode.value = 'boundary'
  sections.value = box.sections
  if (box.direction === 'across') {
    firstCross.value = box.top + 1
    lastCross.value = box.bottom
    start.value = box.left + 1
    ending.value = box.right + 1
    sectionSize.value = (box.right - box.left) / box.sections
  } else {
    firstCross.value = box.left + 1
    lastCross.value = box.right
    start.value = box.top + 1
    ending.value = box.bottom + 1
    sectionSize.value = (box.bottom - box.top) / box.sections
  }
}

function cancelEdit() {
  editingId.value = null
  editingEnabled.value = true
  sizingMode.value = 'size'
  selectedDefaults()
}

function updateFallback(event: Event, eventName: 'horizontal' | 'vertical') {
  const value = Number((event.target as HTMLInputElement).value)
  const normalized = Math.min(20, Math.max(1, Math.floor(value || 1)))
  if (eventName === 'horizontal') emit('horizontal', normalized)
  else emit('vertical', normalized)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-4 p-4">
      <div>
        <h2 class="card-title text-base">Repeat boxes</h2>
        <p class="mt-1 text-xs leading-relaxed text-base-content/65">
          The first section is the source; edits to any section keep every section synchronized.
        </p>
      </div>

      <form class="space-y-3" novalidate @submit.prevent="submit">
        <fieldset class="grid grid-cols-2 gap-1 rounded-box bg-base-200 p-1">
          <legend class="sr-only">Repeat direction</legend>
          <label v-for="option in (['across', 'down'] as RepeatDirection[])" :key="option" class="cursor-pointer">
            <input v-model="direction" class="peer sr-only" type="radio" name="repeat-direction" :value="option" />
            <span class="btn btn-sm w-full border-0 peer-checked:btn-primary">{{ option === 'across' ? 'Across' : 'Down' }}</span>
          </label>
        </fieldset>

        <fieldset>
          <legend class="mb-1 text-xs font-semibold text-base-content/70">Sizing mode</legend>
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            <label class="label cursor-pointer gap-1.5 p-0 text-xs">
              <input v-model="sizingMode" class="radio radio-primary radio-xs" type="radio" name="sizing-mode" value="boundary" />
              End boundary
            </label>
            <label class="label cursor-pointer gap-1.5 p-0 text-xs">
              <input v-model="sizingMode" class="radio radio-primary radio-xs" type="radio" name="sizing-mode" value="size" />
              Section size
            </label>
          </div>
        </fieldset>

        <div class="grid grid-cols-2 gap-2">
          <label class="form-control">
            <span class="label-text mb-1 text-xs">{{ direction === 'across' ? 'Top row' : 'Left column' }}</span>
            <input v-model.number="firstCross" class="input input-bordered input-sm min-w-0 w-full" type="number" min="1" max="500" />
          </label>
          <label class="form-control">
            <span class="label-text mb-1 text-xs">{{ direction === 'across' ? 'Bottom row (inclusive)' : 'Right column (inclusive)' }}</span>
            <input v-model.number="lastCross" class="input input-bordered input-sm min-w-0 w-full" type="number" min="1" max="500" />
          </label>
          <label class="form-control">
            <span class="label-text mb-1 text-xs">{{ direction === 'across' ? 'Start column' : 'Start row' }}</span>
            <input v-model.number="start" class="input input-bordered input-sm min-w-0 w-full" type="number" min="1" max="500" />
          </label>
          <label class="form-control">
            <span class="label-text mb-1 text-xs">Sections (including source)</span>
            <input v-model.number="sections" class="input input-bordered input-sm min-w-0 w-full" type="number" min="2" max="20" />
          </label>
          <label class="form-control col-span-2">
            <span class="label-text mb-1 text-xs">
              <template v-if="sizingMode === 'boundary'">End before {{ direction === 'across' ? 'column' : 'row' }}</template>
              <template v-else>Section {{ direction === 'across' ? 'width' : 'height' }}</template>
            </span>
            <input v-if="sizingMode === 'boundary'" v-model.number="ending" class="input input-bordered input-sm w-full" type="number" min="1" max="501" />
            <input v-else v-model.number="sectionSize" class="input input-bordered input-sm w-full" type="number" min="1" />
          </label>
        </div>

        <p v-if="validationMessage" class="text-xs text-error" role="alert">{{ validationMessage }}</p>
        <p v-else class="rounded-box bg-base-200 px-3 py-2 text-xs leading-relaxed" aria-live="polite">{{ liveSummary }}</p>

        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm min-w-0 flex-1" type="submit" :disabled="!!validationMessage">
            <span class="mdi mdi-content-save-outline" aria-hidden="true"></span>
            {{ editingId ? 'Save changes' : 'Add repeat box' }}
          </button>
          <button v-if="editingId" class="btn btn-ghost btn-sm" type="button" @click="cancelEdit">Cancel</button>
        </div>
      </form>

      <div v-if="boxes.length" class="space-y-2 border-t border-base-300 pt-3">
        <article v-for="box in boxes" :key="box.id" class="rounded-box border border-base-300 p-3" :class="box.enabled ? 'bg-primary/5' : 'opacity-60'">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-medium leading-relaxed">{{ summary(box) }}</p>
              <p class="mt-1 text-[11px] text-base-content/60">Source: {{ sourceSize(box) }}</p>
            </div>
            <label class="flex shrink-0 cursor-pointer items-center">
              <span class="sr-only">Enable {{ summary(box) }}</span>
              <input class="toggle toggle-primary toggle-sm" type="checkbox" :checked="box.enabled" @change="$emit('toggle', box.id, ($event.target as HTMLInputElement).checked)" />
            </label>
          </div>
          <div class="mt-2 flex justify-end gap-1">
            <button class="btn btn-ghost btn-xs" type="button" @click="edit(box)">
              <span class="mdi mdi-pencil-outline" aria-hidden="true"></span>Edit
            </button>
            <button class="btn btn-ghost btn-xs text-error" type="button" @click="$emit('remove', box.id)">
              <span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete
            </button>
          </div>
        </article>
      </div>
      <p v-else class="border-t border-base-300 pt-3 text-xs text-base-content/55">No repeat boxes yet.</p>

      <details class="collapse-arrow collapse border border-base-300 bg-base-100">
        <summary class="collapse-title min-h-0 py-3 text-sm font-medium">Whole-pattern fallback</summary>
        <div class="collapse-content">
          <p class="mb-2 text-xs text-base-content/60">Used only when no repeat boxes exist.</p>
          <div class="grid grid-cols-2 gap-2">
            <label class="form-control">
              <span class="label-text mb-1 text-xs">Across</span>
              <input class="input input-bordered input-sm min-w-0 w-full" type="number" min="1" max="20" :value="horizontal" @change="updateFallback($event, 'horizontal')" />
            </label>
            <label class="form-control">
              <span class="label-text mb-1 text-xs">Down</span>
              <input class="input input-bordered input-sm min-w-0 w-full" type="number" min="1" max="20" :value="vertical" @change="updateFallback($event, 'vertical')" />
            </label>
          </div>
        </div>
      </details>
    </div>
  </section>
</template>
