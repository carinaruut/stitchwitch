<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseAxisSelection } from '../utils/axisSelection'

const props = defineProps<{ selected: number; count: number }>()
const emit = defineEmits<{ before: []; after: []; beginning: []; end: []; fill: []; erase: []; removeCurrent: []; removeRows: [value: string] }>()
const selectionInput = ref('')
const selectionError = ref('')

watch(() => props.selected, (row) => {
  selectionInput.value = String(row + 1)
  selectionError.value = ''
}, { immediate: true })

function deleteRows() {
  if (!parseAxisSelection(selectionInput.value, props.count)) {
    selectionError.value = `Use rows from 1 to ${props.count}, for example 1-3;6.`
    return
  }
  selectionError.value = ''
  emit('removeRows', selectionInput.value)
}
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body gap-3 p-4">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-base">Rows</h2>
        <span class="badge badge-neutral">Row {{ selected + 1 }} of {{ count }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('before')"><span class="mdi mdi-table-row-plus-before" aria-hidden="true"></span>Add before</button>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('after')"><span class="mdi mdi-table-row-plus-after" aria-hidden="true"></span>Add after</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('beginning')"><span class="mdi mdi-arrow-collapse-up" aria-hidden="true"></span>Add at start</button>
        <button class="btn btn-sm btn-ghost" type="button" @click="$emit('end')"><span class="mdi mdi-arrow-collapse-down" aria-hidden="true"></span>Add at end</button>
      </div>
      <div class="grid grid-cols-2 gap-2 border-t border-base-300 pt-3">
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('fill')"><span class="mdi mdi-format-color-fill" aria-hidden="true"></span>Fill current</button>
        <button class="btn btn-sm btn-outline" type="button" @click="$emit('erase')"><span class="mdi mdi-eraser" aria-hidden="true"></span>Erase current</button>
      </div>
      <div class="grid gap-2 border-t border-base-300 pt-3">
        <button class="btn btn-sm btn-error btn-outline" type="button" :disabled="count <= 1" @click="$emit('removeCurrent')"><span class="mdi mdi-delete-outline" aria-hidden="true"></span>Delete current row {{ selected + 1 }}</button>
        <div>
          <label class="label-text text-xs font-medium" for="rows-to-delete">Delete multiple rows</label>
          <div class="join mt-1 flex">
            <input id="rows-to-delete" v-model="selectionInput" class="input input-sm join-item min-w-0 flex-1" type="text" placeholder="1-3;6" aria-describedby="rows-to-delete-help" @keydown.enter.prevent="deleteRows" />
            <button class="btn btn-sm btn-error join-item" type="button" :disabled="count <= 1" @click="deleteRows"><span class="mdi mdi-delete-sweep-outline" aria-hidden="true"></span>Delete</button>
          </div>
          <p id="rows-to-delete-help" class="mt-1 text-xs" :class="selectionError ? 'text-error' : 'text-base-content/55'">{{ selectionError || 'Separate rows with ; and use - for ranges.' }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
