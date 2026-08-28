<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseAxisSelection } from '../../../../utils/axisSelection'

const props = defineProps<{ selected: number; count: number }>()
const emit = defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeRows: [value: string] }>()
const { t } = useI18n({ useScope: 'global' })
const selectionInput = ref('')
const selectionError = ref(false)

watch(() => props.selected, (row) => {
  selectionInput.value = String(row + 1)
  selectionError.value = false
}, { immediate: true })

function deleteRows() {
  if (!parseAxisSelection(selectionInput.value, props.count)) {
    selectionError.value = true
    return
  }
  selectionError.value = false
  emit('removeRows', selectionInput.value)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-settings-panel">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">
          {{ t('controls.axis.rows') }}
        </h2>
        <span class="badge badge-neutral">{{ t('controls.axis.rowPosition', { current: selected + 1, count }) }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn btn-sm btn-outline"
          type="button"
          @click="$emit('before')"
        >
          <span
            class="mdi mdi-table-row-plus-before"
            aria-hidden="true"
          />{{ t('controls.axis.addBefore') }}
        </button>
        <button
          class="btn btn-sm btn-outline"
          type="button"
          @click="$emit('after')"
        >
          <span
            class="mdi mdi-table-row-plus-after"
            aria-hidden="true"
          />{{ t('controls.axis.addAfter') }}
        </button>
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          @click="$emit('beginning')"
        >
          <span
            class="mdi mdi-arrow-collapse-up"
            aria-hidden="true"
          />{{ t('controls.axis.addAtStart') }}
        </button>
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          @click="$emit('end')"
        >
          <span
            class="mdi mdi-arrow-collapse-down"
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
          />{{ t('controls.axis.deleteCurrentRow', { number: selected + 1 }) }}
        </button>
        <div class="app-field">
          <label
            class="app-field-label"
            for="rows-to-delete"
          >{{ t('controls.axis.deleteMultipleRows') }}</label>
          <div class="join flex">
            <input
              id="rows-to-delete"
              v-model="selectionInput"
              class="input input-sm join-item min-w-0 flex-1"
              type="text"
              placeholder="1-3;6"
              aria-describedby="rows-to-delete-help"
              @keydown.enter.prevent="deleteRows"
            >
            <button
              class="btn btn-sm btn-error join-item"
              type="button"
              :disabled="count <= 1"
              @click="deleteRows"
            >
              <span
                class="mdi mdi-delete-sweep-outline"
                aria-hidden="true"
              />{{ t('controls.axis.delete') }}
            </button>
          </div>
          <p
            id="rows-to-delete-help"
            class="text-xs"
            :class="selectionError ? 'text-error' : 'text-base-content/55'"
          >
            {{ t(selectionError ? 'controls.axis.rowsInvalid' : 'controls.axis.rowsHelp', { count }) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
