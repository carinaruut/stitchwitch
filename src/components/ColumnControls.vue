<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseAxisSelection } from '../utils/axisSelection'

const props = defineProps<{ selected: number; count: number }>()
const emit = defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeColumns: [value: string] }>()
const selectionInput = ref('')
const selectionError = ref('')

watch(() => props.selected, (column) => {
  selectionInput.value = String(column + 1)
  selectionError.value = ''
}, { immediate: true })

function deleteColumns() {
  if (!parseAxisSelection(selectionInput.value, props.count)) {
    selectionError.value = `Use columns from 1 to ${props.count}, for example 1-3;6.`
    return
  }
  selectionError.value = ''
  emit('removeColumns', selectionInput.value)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">Columns</h2>
        <span class="badge badge-neutral">Column {{ selected + 1 }} of {{ count }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('before')"><span class="mdi mdi-table-column-plus-before" aria-hidden="true"></span>Add before</button>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('after')"><span class="mdi mdi-table-column-plus-after" aria-hidden="true"></span>Add after</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('beginning')"><span class="mdi mdi-arrow-collapse-left" aria-hidden="true"></span>Add at start</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('end')"><span class="mdi mdi-arrow-collapse-right" aria-hidden="true"></span>Add at end</button>
      </div>
      <div class="grid grid-cols-2 gap-2 border-t border-base-300 pt-3">
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('fill')"><span class="mdi mdi-format-color-fill" aria-hidden="true"></span>Fill current</button>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('erase')"><span class="mdi mdi-eraser" aria-hidden="true"></span>Erase current</button>
      </div>
      <div class="grid gap-2 border-t border-base-300 pt-3">
        <button class="btn btn-sm btn-error btn-outline" type="button" :disabled="count <= 1" @click="$emit('removeCurrent')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete current column {{ selected + 1 }}</button>
        <div>
          <label class="label-text text-xs font-medium" for="columns-to-delete">Delete multiple columns</label>
          <div class="join mt-1 flex">
            <input id="columns-to-delete" v-model="selectionInput" class="input input-sm join-item min-w-0 flex-1" type="text" placeholder="1-3;6" aria-describedby="columns-to-delete-help" @keydown.enter.prevent="deleteColumns" />
            <button class="btn btn-sm btn-error join-item" type="button" :disabled="count <= 1" @click="deleteColumns"><span class="mdi mdi-delete-sweep-outline" aria-hidden="true"></span>Delete</button>
          </div>
          <p id="columns-to-delete-help" class="mt-1 text-xs" :class="selectionError ? 'text-error' : 'text-base-content/55'">{{ selectionError || 'Separate columns with ; and use - for ranges.' }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
