<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MAX_REPEAT_COUNT, type NewPatternProject } from '../../../types/pattern'
import AppModal from '../../../shared/ui/AppModal.vue'
import VisualColorPicker from '../../palette/components/VisualColorPicker.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ create: [project: NewPatternProject]; cancel: [] }>()
const { locale, t } = useI18n({ useScope: 'global' })
const errorKey = ref('')
const defaultName = ref(t('controls.newProject.defaultName'))
const form = reactive({
  name: defaultName.value,
  rows: 20,
  columns: 20,
  cellSize: 24,
  backgroundColor: '#ffffff',
  horizontalRepeats: 1,
  verticalRepeats: 1,
})

watch(() => props.open, (open) => { if (open) errorKey.value = '' })
watch(locale, () => {
  if (form.name === defaultName.value) form.name = t('controls.newProject.defaultName')
  defaultName.value = t('controls.newProject.defaultName')
})

function submit() {
  if (!form.name.trim()) {
    errorKey.value = 'controls.newProject.nameRequired'
    return
  }
  if (![form.rows, form.columns].every((value) => Number.isInteger(value) && value >= 1 && value <= 200)) {
    errorKey.value = 'controls.newProject.dimensionsInvalid'
    return
  }
  if (![form.horizontalRepeats, form.verticalRepeats].every((value) => Number.isInteger(value) && value >= 1 && value <= MAX_REPEAT_COUNT)) {
    errorKey.value = 'controls.newProject.repeatsInvalid'
    return
  }
  emit('create', { ...form, name: form.name.trim() })
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('controls.newProject.title')"
    :close-label="t('controls.newProject.close')"
    size="base"
    :show-close-button="false"
    @close="$emit('cancel')"
  >
    <form
      id="new-project-form"
      class="app-page-stack"
      @submit.prevent="submit"
    >
      <div
        v-if="errorKey"
        class="alert alert-error text-sm"
        role="alert"
      >
        {{ t(errorKey, { max: MAX_REPEAT_COUNT }) }}
      </div>
      <div
        class="grid gap-4 sm:grid-cols-2"
      >
        <label class="app-field sm:col-span-2"><span class="app-field-label">{{ t('controls.newProject.projectName') }}</span><input
          v-model="form.name"
          class="input input-bordered w-full"
          required
          maxlength="100"
          autofocus
        ></label>
        <label class="app-field"><span class="app-field-label">{{ t('controls.newProject.rows') }}</span><input
          v-model.number="form.rows"
          class="input input-bordered w-full"
          type="number"
          min="1"
          max="200"
          required
        ></label>
        <label class="app-field"><span class="app-field-label">{{ t('controls.newProject.columns') }}</span><input
          v-model.number="form.columns"
          class="input input-bordered w-full"
          type="number"
          min="1"
          max="200"
          required
        ></label>
        <label class="app-field sm:col-span-2"><span class="app-field-label">{{ t('controls.newProject.cellSize', { size: form.cellSize }) }}</span><input
          v-model.number="form.cellSize"
          class="range range-primary"
          type="range"
          min="8"
          max="64"
        ></label>
        <fieldset class="app-field sm:col-span-2">
          <legend class="app-field-label">
            {{ t('controls.newProject.backgroundColor') }}
          </legend>
          <div class="app-inset-panel grid gap-3">
            <div class="flex items-center gap-2">
              <span
                class="size-9 rounded-box border border-base-content/25 shadow-sm"
                :style="{ backgroundColor: form.backgroundColor }"
                aria-hidden="true"
              />
              <strong class="font-mono text-sm">{{ form.backgroundColor.toUpperCase() }}</strong>
            </div>
            <VisualColorPicker v-model="form.backgroundColor" />
          </div>
        </fieldset>
        <label class="app-field"><span class="app-field-label">{{ t('controls.newProject.horizontalRepeats') }}</span><input
          v-model.number="form.horizontalRepeats"
          class="input input-bordered w-full"
          type="number"
          min="1"
          :max="MAX_REPEAT_COUNT"
          required
        ></label>
        <label class="app-field"><span class="app-field-label">{{ t('controls.newProject.verticalRepeats') }}</span><input
          v-model.number="form.verticalRepeats"
          class="input input-bordered w-full"
          type="number"
          min="1"
          :max="MAX_REPEAT_COUNT"
          required
        ></label>
      </div>
    </form>
    <template #actions>
      <button
        class="btn"
        type="button"
        @click="$emit('cancel')"
      >
        {{ t('controls.common.cancel') }}
      </button>
      <button
        class="btn btn-primary"
        type="submit"
        form="new-project-form"
      >
        {{ t('controls.newProject.create') }}
      </button>
    </template>
  </AppModal>
</template>
