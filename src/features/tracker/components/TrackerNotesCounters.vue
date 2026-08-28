<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrackerController } from '../composables/useTracker'
import { MAX_TRACKER_COUNTER_NAME_LENGTH, MAX_TRACKER_COUNTERS, MAX_TRACKER_PROJECT_NOTE_LENGTH, MAX_TRACKER_ROW_NOTE_LENGTH } from '../../../types/tracker'

const props = defineProps<{ rowIds: string[]; state: TrackerController }>()
const { t } = useI18n({ useScope: 'global' })
const newCounterName = ref('')
const newRowId = ref('')
const newRowNote = ref('')
const activeTracker = computed(() => props.state.tracker.value!)
const notedRows = computed(() => props.rowIds.flatMap((id, index) => {
  const note = activeTracker.value.rowNotes[id]
  return note ? [{ id, row: index + 1, note }] : []
}))
const availableRows = computed(() => props.rowIds.flatMap((id, index) => activeTracker.value.rowNotes[id] ? [] : [{ id, row: index + 1 }]))

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value
}

function addCounter() {
  if (props.state.addCounter(newCounterName.value)) newCounterName.value = ''
}

function addRowNote() {
  if (!newRowId.value || !newRowNote.value.trim()) return
  props.state.setRowNote(newRowId.value, newRowNote.value.trim())
  newRowId.value = ''
  newRowNote.value = ''
}

function renameCounter(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (!props.state.renameCounter(id, input.value)) {
    input.value = activeTracker.value.counters.find((counter) => counter.id === id)?.name ?? ''
  }
}
</script>

<template>
  <div class="w-full space-y-5">
    <label class="flex flex-col gap-2">
      <span class="text-sm font-semibold">{{ t('tracker.notes.project') }}</span>
      <textarea
        class="textarea textarea-bordered min-h-20 w-full resize-y text-sm leading-relaxed"
        :value="activeTracker.projectNote"
        :maxlength="MAX_TRACKER_PROJECT_NOTE_LENGTH"
        :placeholder="t('tracker.notes.projectPlaceholder')"
        @input="state.setProjectNote(inputValue($event))"
      />
    </label>

    <hr class="border-base-300">
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">
          {{ t('tracker.notes.rows') }}
        </h3>
        <span
          v-if="notedRows.length"
          class="badge badge-sm"
        >{{ notedRows.length }}</span>
      </div>

      <form
        v-if="availableRows.length"
        class="space-y-2 rounded-box border border-base-300 bg-base-200/40 p-3"
        @submit.prevent="addRowNote"
      >
        <select
          v-model="newRowId"
          class="select select-bordered select-sm w-full"
          :aria-label="t('tracker.notes.assignRow')"
        >
          <option
            value=""
            disabled
          >
            {{ t('tracker.notes.chooseRow') }}
          </option>
          <option
            v-for="item in availableRows"
            :key="item.id"
            :value="item.id"
          >
            {{ t('tracker.notes.row', { row: item.row }) }}
          </option>
        </select>
        <textarea
          v-model="newRowNote"
          class="textarea textarea-bordered textarea-sm min-h-16 w-full resize-y text-sm leading-relaxed"
          :maxlength="MAX_TRACKER_ROW_NOTE_LENGTH"
          :placeholder="t('tracker.notes.notePlaceholder')"
          :aria-label="t('tracker.notes.note')"
        />
        <button
          class="btn btn-primary btn-sm w-full"
          type="submit"
          :disabled="!newRowId || !newRowNote.trim()"
        >
          <span
            class="mdi mdi-plus"
            aria-hidden="true"
          />{{ t('tracker.notes.add') }}
        </button>
      </form>

      <p
        v-if="notedRows.length === 0"
        class="text-xs text-base-content/55"
      >
        {{ t('tracker.notes.empty') }}
      </p>
      <ul
        v-else
        class="space-y-2"
      >
        <li
          v-for="item in notedRows"
          :key="item.id"
          class="rounded-box border border-base-300 bg-base-200/40 p-3"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="text-xs font-semibold">{{ t('tracker.notes.row', { row: item.row }) }}</span>
            <button
              class="btn btn-ghost btn-square btn-xs text-error"
              type="button"
              :aria-label="t('tracker.notes.remove', { row: item.row })"
              :title="t('tracker.notes.remove', { row: item.row })"
              @click="state.setRowNote(item.id, '')"
            >
              <span
                class="mdi mdi-delete-outline"
                aria-hidden="true"
              />
            </button>
          </div>
          <textarea
            class="textarea textarea-bordered textarea-sm min-h-16 w-full resize-y text-sm leading-relaxed"
            :value="item.note"
            :maxlength="MAX_TRACKER_ROW_NOTE_LENGTH"
            :aria-label="t('tracker.notes.edit', { row: item.row })"
            @input="state.setRowNote(item.id, inputValue($event))"
          />
        </li>
      </ul>
    </div>

    <hr class="border-base-300">
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-semibold">
          {{ t('tracker.counters.title') }}
        </h3>
        <p class="mt-1 text-xs text-base-content/60">
          {{ t('tracker.counters.description') }}
        </p>
      </div>

      <form
        class="join flex w-full"
        @submit.prevent="addCounter"
      >
        <input
          v-model="newCounterName"
          class="input input-bordered input-sm join-item min-w-0 flex-1"
          type="text"
          :maxlength="MAX_TRACKER_COUNTER_NAME_LENGTH"
          :placeholder="t('tracker.counters.namePlaceholder')"
          :aria-label="t('tracker.counters.name')"
        >
        <button
          class="btn btn-primary btn-sm join-item"
          type="submit"
          :disabled="!newCounterName.trim() || activeTracker.counters.length >= MAX_TRACKER_COUNTERS"
        >
          <span
            class="mdi mdi-plus"
            aria-hidden="true"
          />{{ t('tracker.counters.add') }}
        </button>
      </form>

      <p
        v-if="activeTracker.counters.length === 0"
        class="rounded-box border border-dashed border-base-300 p-5 text-center text-sm text-base-content/55"
      >
        {{ t('tracker.counters.empty') }}
      </p>

      <ul
        v-else
        class="space-y-2"
      >
        <li
          v-for="counter in activeTracker.counters"
          :key="counter.id"
          class="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-200/40 p-2"
        >
          <input
            class="input input-ghost input-sm min-w-32 flex-1 font-semibold"
            type="text"
            :value="counter.name"
            :maxlength="MAX_TRACKER_COUNTER_NAME_LENGTH"
            :aria-label="t('tracker.counters.rename', { name: counter.name })"
            @change="renameCounter(counter.id, $event)"
          >
          <div class="join">
            <button
              class="btn btn-sm join-item"
              type="button"
              :aria-label="t('tracker.counters.decrement', { name: counter.name })"
              @click="state.adjustCounter(counter.id, -1)"
            >
              <span
                class="mdi mdi-minus"
                aria-hidden="true"
              />
            </button>
            <output
              class="flex min-w-14 items-center justify-center border-y border-base-300 bg-base-100 px-2 font-mono font-bold tabular-nums"
              :aria-label="t('tracker.counters.value', { name: counter.name, value: counter.value })"
            >{{ counter.value }}</output>
            <button
              class="btn btn-sm join-item"
              type="button"
              :aria-label="t('tracker.counters.increment', { name: counter.name })"
              @click="state.adjustCounter(counter.id, 1)"
            >
              <span
                class="mdi mdi-plus"
                aria-hidden="true"
              />
            </button>
          </div>
          <button
            class="btn btn-ghost btn-square btn-sm"
            type="button"
            :disabled="counter.value === 0"
            :aria-label="t('tracker.counters.reset', { name: counter.name })"
            :title="t('tracker.counters.reset', { name: counter.name })"
            @click="state.resetCounter(counter.id)"
          >
            <span
              class="mdi mdi-restart"
              aria-hidden="true"
            />
          </button>
          <button
            class="btn btn-ghost btn-square btn-sm text-error"
            type="button"
            :aria-label="t('tracker.counters.remove', { name: counter.name })"
            :title="t('tracker.counters.remove', { name: counter.name })"
            @click="state.removeCounter(counter.id)"
          >
            <span
              class="mdi mdi-delete-outline"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
