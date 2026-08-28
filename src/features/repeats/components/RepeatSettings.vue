<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MAX_REPEAT_COUNT, type RepeatBox, type RepeatBoxInput, type RepeatDirection } from '../../../types/pattern'

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
  save: [input: RepeatBoxInput, id: string | null, complete: (error: string | null) => void]
  toggle: [id: string, enabled: boolean]
  remove: [id: string]
}>()
const { t } = useI18n({ useScope: 'global' })

type SizingMode = 'boundary' | 'sections'

const direction = ref<RepeatDirection>('across')
const sizingMode = ref<SizingMode>('sections')
const firstCross = ref(1)
const lastCross = ref(1)
const start = ref(1)
const ending = ref(3)
const sectionSize = ref(1)
const sections = ref(2)
const editingId = ref<string | null>(null)
const editingEnabled = ref(true)
const saveError = ref('')

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

const totalLength = computed(() => sizingMode.value === 'boundary'
  ? values.value.ending - values.value.start
  : values.value.sectionSize * values.value.sections)
const sectionCount = computed(() => sizingMode.value === 'boundary'
  ? totalLength.value / values.value.sectionSize
  : values.value.sections)

const validationMessage = computed(() => {
  const value = values.value
  const coordinates = [value.firstCross, value.lastCross, value.start, value.sectionSize]
  coordinates.push(sizingMode.value === 'boundary' ? value.ending : value.sections)

  if (!coordinates.every((item) => Number.isInteger(item) && item > 0)) {
    return t('controls.repeat.validation.positiveIntegers')
  }
  if (value.lastCross < value.firstCross) {
    return direction.value === 'across'
      ? t('controls.repeat.validation.bottomAfterTop')
      : t('controls.repeat.validation.rightAfterLeft')
  }

  if (value.lastCross > 500 || value.start > 500) {
    return t('controls.repeat.validation.extent')
  }
  if (totalLength.value <= 0 || value.start - 1 + totalLength.value > 500) {
    return t('controls.repeat.validation.ending')
  }
  if (sizingMode.value === 'boundary' && !Number.isInteger(sectionCount.value)) {
    return t('controls.repeat.validation.evenlyDivisible')
  }
  if (sectionCount.value < 2 || sectionCount.value > MAX_REPEAT_COUNT) {
    return t('controls.repeat.validation.sectionRange', { max: MAX_REPEAT_COUNT })
  }
  return ''
})
const displayedError = computed(() => validationMessage.value || saveError.value)

watch([direction, sizingMode, firstCross, lastCross, start, ending, sectionSize, sections], () => {
  saveError.value = ''
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
      sections: sectionCount.value,
      enabled: editingEnabled.value,
    }
  }
  return {
    direction: 'down',
    top: value.start - 1,
    bottom: end,
    left: value.firstCross - 1,
    right: value.lastCross,
    sections: sectionCount.value,
    enabled: editingEnabled.value,
  }
})

function summaryRange(box: RepeatBoxInput) {
  return t('controls.repeat.range', { top: box.top + 1, bottom: box.bottom, left: box.left + 1, right: box.right })
}

function summarySections(box: RepeatBoxInput) {
  const sectionLength = box.direction === 'across'
    ? (box.right - box.left) / box.sections
    : (box.bottom - box.top) / box.sections
  const unitKey = box.direction === 'across' ? 'controls.repeat.sectionUnitColumn' : 'controls.repeat.sectionUnitRow'
  return t('controls.repeat.sectionSummary', {
    sections: box.sections,
    length: sectionLength,
    unit: t(unitKey, { count: sectionLength }, sectionLength),
  }, box.sections)
}

function summary(box: RepeatBoxInput) {
  return `${summaryRange(box)}. ${summarySections(box)}.`
}

function sourceSize(box: RepeatBox) {
  const rows = box.direction === 'down' ? (box.bottom - box.top) / box.sections : box.bottom - box.top
  const columns = box.direction === 'across' ? (box.right - box.left) / box.sections : box.right - box.left
  const key = rows === 1
    ? (columns === 1 ? 'controls.repeat.sourceSizeBothOne' : 'controls.repeat.sourceSizeOneRow')
    : (columns === 1 ? 'controls.repeat.sourceSizeOneColumn' : 'controls.repeat.sourceSize')
  return t(key, { rows, columns })
}

function submit() {
  if (!input.value) return
  saveError.value = ''
  emit('save', input.value, editingId.value, (error) => {
    if (error) saveError.value = error
    else cancelEdit()
  })
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
  sizingMode.value = 'sections'
  selectedDefaults()
}

function updateFallback(event: Event, eventName: 'horizontal' | 'vertical') {
  const value = Number((event.target as HTMLInputElement).value)
  const normalized = Math.min(MAX_REPEAT_COUNT, Math.max(1, Math.floor(value || 1)))
  if (eventName === 'horizontal') emit('horizontal', normalized)
  else emit('vertical', normalized)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-settings-panel">
      <div class="app-field">
        <h2 class="card-title text-base">
          {{ t('controls.repeat.title') }}
        </h2>
        <p class="text-xs leading-relaxed text-base-content/60">
          {{ t('controls.repeat.description') }}
        </p>
      </div>

      <form
        class="grid gap-3"
        novalidate
        @submit.prevent="submit"
      >
        <fieldset class="grid grid-cols-2 gap-1 rounded-box bg-base-200 p-1">
          <legend class="sr-only">
            {{ t('controls.repeat.direction') }}
          </legend>
          <label
            v-for="option in (['across', 'down'] as RepeatDirection[])"
            :key="option"
            class="cursor-pointer"
          >
            <input
              v-model="direction"
              class="peer sr-only"
              type="radio"
              name="repeat-direction"
              :value="option"
            >
            <span class="btn btn-sm w-full border-0 peer-checked:btn-primary">{{ t(`controls.repeat.${option}`) }}</span>
          </label>
        </fieldset>

        <fieldset class="grid grid-cols-2 gap-1 rounded-box bg-base-200 p-1">
          <legend class="sr-only">
            {{ t('controls.repeat.sizingMethod') }}
          </legend>
          <label class="cursor-pointer">
            <input
              v-model="sizingMode"
              class="peer sr-only"
              type="radio"
              name="repeat-sizing"
              value="sections"
            >
            <span class="btn btn-xs h-8 w-full border-0 peer-checked:btn-primary">{{ t('controls.repeat.sectionCount') }}</span>
          </label>
          <label class="cursor-pointer">
            <input
              v-model="sizingMode"
              class="peer sr-only"
              type="radio"
              name="repeat-sizing"
              value="boundary"
            >
            <span class="btn btn-xs h-8 w-full border-0 peer-checked:btn-primary">{{ t('controls.repeat.endBoundary') }}</span>
          </label>
        </fieldset>

        <div class="grid grid-cols-2 gap-2">
          <label class="app-field">
            <span class="text-xs font-medium">{{ t(direction === 'across' ? 'controls.repeat.topRow' : 'controls.repeat.leftColumn') }}</span>
            <input
              v-model.number="firstCross"
              class="input input-bordered input-sm min-w-0 w-full"
              type="number"
              min="1"
              max="500"
            >
          </label>
          <label class="app-field">
            <span class="text-xs font-medium">{{ t(direction === 'across' ? 'controls.repeat.bottomRow' : 'controls.repeat.rightColumn') }}</span>
            <input
              v-model.number="lastCross"
              class="input input-bordered input-sm min-w-0 w-full"
              type="number"
              min="1"
              max="500"
            >
          </label>
          <label class="app-field">
            <span class="text-xs font-medium">{{ t(direction === 'across' ? 'controls.repeat.startColumn' : 'controls.repeat.startRow') }}</span>
            <input
              v-model.number="start"
              class="input input-bordered input-sm min-w-0 w-full"
              type="number"
              min="1"
              max="500"
            >
          </label>
          <label class="app-field">
            <template v-if="sizingMode === 'boundary'">
              <span class="text-xs font-medium">{{ t(direction === 'across' ? 'controls.repeat.endBeforeColumn' : 'controls.repeat.endBeforeRow') }}</span>
              <input
                v-model.number="ending"
                class="input input-bordered input-sm min-w-0 w-full"
                type="number"
                min="2"
                max="501"
              >
            </template>
            <template v-else>
              <span class="text-xs font-medium">{{ t('controls.repeat.sections') }}</span>
              <input
                v-model.number="sections"
                class="input input-bordered input-sm min-w-0 w-full"
                type="number"
                min="2"
                :max="MAX_REPEAT_COUNT"
              >
            </template>
          </label>
          <label class="app-field col-span-2">
            <span class="text-xs font-medium">{{ t(direction === 'across' ? 'controls.repeat.sectionWidth' : 'controls.repeat.sectionHeight') }}</span>
            <input
              v-model.number="sectionSize"
              class="input input-bordered input-sm w-full"
              type="number"
              min="1"
              max="500"
            >
          </label>
        </div>
        <p class="text-[11px] text-base-content/50">
          {{ t('controls.repeat.includedBoundary') }}
          <template v-if="sizingMode === 'boundary'">
            {{ t('controls.repeat.excludedBoundaryHelp') }}
          </template>
          <template v-else>
            {{ t('controls.repeat.calculatedBoundaryHelp') }}
          </template>
        </p>

        <p
          v-if="displayedError"
          class="text-xs text-error"
          role="alert"
        >
          {{ displayedError }}
        </p>
        <div
          v-else
          class="rounded-box bg-base-200/70 px-3 py-2 text-xs"
          aria-live="polite"
        >
          <p class="font-medium">
            {{ summaryRange(input!) }}
          </p>
          <p class="mt-0.5 text-base-content/60">
            {{ summarySections(input!) }}
          </p>
        </div>

        <div class="flex gap-2">
          <button
            class="btn btn-primary btn-sm min-w-0 flex-1"
            type="submit"
            :disabled="!!validationMessage"
          >
            <span
              class="mdi mdi-repeat"
              aria-hidden="true"
            />
            {{ t(editingId ? 'controls.repeat.saveChanges' : 'controls.repeat.addBox') }}
          </button>
          <button
            v-if="editingId"
            class="btn btn-ghost btn-sm"
            type="button"
            @click="cancelEdit"
          >
            {{ t('controls.common.cancel') }}
          </button>
        </div>
      </form>

      <div
        v-if="boxes.length"
        class="app-settings-section"
      >
        <article
          v-for="box in boxes"
          :key="box.id"
          class="grid gap-2 rounded-box border border-base-300 p-3"
          :class="box.enabled ? 'bg-primary/5' : 'opacity-60'"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="grid min-w-0 gap-1">
              <p class="text-xs font-medium leading-relaxed">
                {{ summaryRange(box) }}
              </p>
              <p class="text-[11px] text-base-content/60">
                {{ summarySections(box) }}
              </p>
              <p class="text-[11px] text-base-content/60">
                {{ t('controls.repeat.source', { size: sourceSize(box) }) }}
              </p>
            </div>
            <label class="flex shrink-0 cursor-pointer items-center">
              <span class="sr-only">{{ t('controls.repeat.enable', { summary: summary(box) }) }}</span>
              <input
                class="toggle toggle-primary toggle-sm"
                type="checkbox"
                :checked="box.enabled"
                @change="$emit('toggle', box.id, ($event.target as HTMLInputElement).checked)"
              >
            </label>
          </div>
          <div class="flex justify-end gap-1">
            <button
              class="btn btn-ghost btn-xs"
              type="button"
              @click="edit(box)"
            >
              <span
                class="mdi mdi-pencil-outline"
                aria-hidden="true"
              />{{ t('controls.common.edit') }}
            </button>
            <button
              class="btn btn-ghost btn-xs text-error"
              type="button"
              @click="$emit('remove', box.id)"
            >
              <span
                class="mdi mdi-delete-outline"
                aria-hidden="true"
              />{{ t('controls.common.delete') }}
            </button>
          </div>
        </article>
      </div>
      <p
        v-else
        class="app-settings-section text-xs text-base-content/55"
      >
        {{ t('controls.repeat.none') }}
      </p>

      <details class="collapse-arrow collapse border border-base-300 bg-base-100">
        <summary class="collapse-title min-h-0 py-3 text-sm font-medium">
          {{ t('controls.repeat.fallbackTitle') }}
        </summary>
        <div class="collapse-content grid gap-2">
          <p class="text-xs text-base-content/60">
            {{ t('controls.repeat.fallbackHelp') }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <label class="app-field">
              <span class="app-field-label">{{ t('controls.repeat.across') }}</span>
              <input
                class="input input-bordered input-sm min-w-0 w-full"
                type="number"
                min="1"
                :max="MAX_REPEAT_COUNT"
                :value="horizontal"
                @change="updateFallback($event, 'horizontal')"
              >
            </label>
            <label class="app-field">
              <span class="app-field-label">{{ t('controls.repeat.down') }}</span>
              <input
                class="input input-bordered input-sm min-w-0 w-full"
                type="number"
                min="1"
                :max="MAX_REPEAT_COUNT"
                :value="vertical"
                @change="updateFallback($event, 'vertical')"
              >
            </label>
          </div>
        </div>
      </details>
    </div>
  </section>
</template>
