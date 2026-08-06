<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { PatternProject } from '../types/pattern'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ create: [project: Omit<PatternProject, 'format' | 'version' | 'cells' | 'recentColors' | 'repeatBoxes'>]; cancel: [] }>()
const error = ref('')
const form = reactive({
  name: 'My pattern',
  rows: 20,
  columns: 20,
  cellSize: 24,
  backgroundColor: '#ffffff',
  horizontalRepeats: 1,
  verticalRepeats: 1,
})

watch(() => props.open, (open) => { if (open) error.value = '' })

function submit() {
  if (!form.name.trim()) {
    error.value = 'Enter a project name.'
    return
  }
  if (![form.rows, form.columns].every((value) => Number.isInteger(value) && value >= 1 && value <= 200)) {
    error.value = 'Rows and columns must be whole numbers from 1 to 200.'
    return
  }
  emit('create', { ...form, name: form.name.trim() })
}
</script>

<template>
  <div v-if="open" class="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="new-project-title" @keydown.esc="$emit('cancel')">
    <form class="modal-box" @submit.prevent="submit">
      <h2 id="new-project-title" class="text-lg font-bold">Create a new pattern</h2>
      <div v-if="error" class="alert alert-error mt-4 text-sm" role="alert">{{ error }}</div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="form-control sm:col-span-2"><span class="label-text mb-1">Project name</span><input v-model="form.name" class="input input-bordered w-full" required maxlength="100" autofocus /></label>
        <label class="form-control"><span class="label-text mb-1">Rows</span><input v-model.number="form.rows" class="input input-bordered w-full" type="number" min="1" max="200" required /></label>
        <label class="form-control"><span class="label-text mb-1">Columns</span><input v-model.number="form.columns" class="input input-bordered w-full" type="number" min="1" max="200" required /></label>
        <label class="form-control sm:col-span-2"><span class="label-text mb-1">Cell size: {{ form.cellSize }} px</span><input v-model.number="form.cellSize" class="range range-primary" type="range" min="8" max="64" /></label>
        <label class="form-control"><span class="label-text mb-1">Horizontal repeats</span><select v-model.number="form.horizontalRepeats" class="select select-bordered w-full"><option v-for="value in 10" :key="value">{{ value }}</option></select></label>
        <label class="form-control"><span class="label-text mb-1">Vertical repeats</span><select v-model.number="form.verticalRepeats" class="select select-bordered w-full"><option v-for="value in 10" :key="value">{{ value }}</option></select></label>
      </div>
      <div class="modal-action">
        <button class="btn" type="button" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-primary" type="submit">Create pattern</button>
      </div>
    </form>
    <button class="modal-backdrop" type="button" aria-label="Close dialog" @click="$emit('cancel')">close</button>
  </div>
</template>
