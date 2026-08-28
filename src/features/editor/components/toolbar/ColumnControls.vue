<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseAxisSelection } from '../../../../utils/axisSelection'

const props = defineProps<{ selected: number; count: number }>()
const emit = defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeColumns: [value: string] }>()
const { t } = useI18n({ useScope: 'global' })
const selectionInput = ref('')
const selectionError = ref(false)

watch(() => props.selected, (column) => {
  selectionInput.value = String(column + 1)
  selectionError.value = false
}, { immediate: true })

function deleteColumns() {
  if (!parseAxisSelection(selectionInput.value, props.count)) {
    selectionError.value = true
    return
  }
  selectionError.value = false
  emit('removeColumns', selectionInput.value)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-settings-panel">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">
          {{ t('controls.axis.columns') }}
        </h2>
        <span class="badge badge-neutral">{{ t('controls.axis.columnPosition', { current: selected + 1, count }) }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn btn-sm btn-outline"
          type="button"
          @click="$emit('before')"
        >
          <span
            class="mdi mdi-table-column-plus-before"
            aria-hidden="true"
          />{{ t('controls.axis.addBefore') }}
        </button>
        <button
          class="btn btn-sm btn-outline"
          type="button"
          @click="$emit('after')"
        >
          <span
            class="mdi mdi-table-column-plus-after"
            aria-hidden="true"
          />{{ t('controls.axis.addAfter') }}
        </button>
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          @click="$emit('beginning')"
        >
          <span
            class="mdi mdi-arrow-collapse-left"
            aria-hidden="true"
          />{{ t('controls.axis.addAtStart') }}
        </button>
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          @click="$emit('end')"
        >
          <span
            class="mdi mdi-arrow-collapse-right"
            aria-hidden="true"
          />{{ t('controls.axis.addAtEnd') }}
        </button>
      </div>
      <div class="app-settings-section grid-cols-2">
        <button
          class="btn btn-sm btn-outline"
          type="button"
          @click="$emit('fill')"
        >
          <span
            class="mdi mdi-format-color-fill"
            aria-hidden="true"
          />{{ t('controls.axis.fillCurrent') }}
        </button>
        <button
          class="btn btn-sm btn-outline"
          type="button"
          @click="$emit('erase')"
        >
          <span
            class="mdi mdi-eraser"
            aria-hidden="true"
          />{{ t('controls.axis.eraseCurrent') }}
        </button>
      </div>
      <div class="app-settings-section">
        <button
          class="btn btn-sm btn-error btn-outline"
          type="button"
          :disabled="count <= 1"
          @click="$emit('removeCurrent')"
        >
          <span
            class="mdi mdi-delete-outline"
            aria-hidden="true"
          />{{ t('controls.axis.deleteCurrentColumn', { number: selected + 1 }) }}
        </button>
        <div class="app-field">
          <label
            class="app-field-label"
            for="columns-to-delete"
          >{{ t('controls.axis.deleteMultipleColumns') }}</label>
          <div class="join flex">
            <input
              id="columns-to-delete"
              v-model="selectionInput"
              class="input input-sm join-item min-w-0 flex-1"
              type="text"
              placeholder="1-3;6"
              aria-describedby="columns-to-delete-help"
              @keydown.enter.prevent="deleteColumns"
            >
            <button
              class="btn btn-sm btn-error join-item"
              type="button"
              :disabled="count <= 1"
              @click="deleteColumns"
            >
              <span
                class="mdi mdi-delete-sweep-outline"
                aria-hidden="true"
              />{{ t('controls.axis.delete') }}
            </button>
          </div>
          <p
            id="columns-to-delete-help"
            class="text-xs"
            :class="selectionError ? 'text-error' : 'text-base-content/55'"
          >
            {{ t(selectionError ? 'controls.axis.columnsInvalid' : 'controls.axis.columnsHelp', { count }) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
