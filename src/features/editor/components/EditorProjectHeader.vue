<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  name: string
  autosaveStatus: 'saving' | 'saved' | 'error'
  downloadBackupNeeded: boolean
  rows: number
  columns: number
}>()
const emit = defineEmits<{ rename: [name: string] }>()
const { t } = useI18n({ useScope: 'global' })
const draftName = ref(props.name)

watch(() => props.name, name => { draftName.value = name })

function saveName() {
  const name = draftName.value.trim()
  if (!name) draftName.value = props.name
  else {
    draftName.value = name
    emit('rename', name)
  }
}

function blurName(event: KeyboardEvent) {
  ;(event.currentTarget as HTMLInputElement).blur()
}

function cancelName(event: KeyboardEvent) {
  draftName.value = props.name
  blurName(event)
}

defineExpose({ saveName })
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <input
      v-model="draftName"
      class="input input-ghost h-auto min-h-0 w-full max-w-lg px-0 py-0 text-xl font-bold focus:px-2 focus:py-1"
      type="text"
      required
      maxlength="100"
      :aria-label="t('controls.newProject.projectName')"
      @blur="saveName"
      @keydown.enter.prevent="blurName"
      @keydown.esc.prevent="cancelName"
    >
    <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div class="flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          class="badge"
          :class="autosaveStatus === 'error' ? 'badge-error' : autosaveStatus === 'saving' ? 'badge-ghost' : 'badge-success badge-outline'"
        >
          <span
            class="mdi"
            :class="autosaveStatus === 'error' ? 'mdi-alert-circle-outline' : autosaveStatus === 'saving' ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'"
            aria-hidden="true"
          />
          {{ t(`editor.status.${autosaveStatus}`) }}
        </span>
        <span
          v-if="downloadBackupNeeded"
          class="badge badge-warning badge-outline"
        >
          <span
            class="mdi mdi-download-alert-outline"
            aria-hidden="true"
          />
          {{ t('editor.status.notDownloaded') }}
        </span>
        <span class="badge badge-primary">{{ t(columns === 1 ? 'editor.status.oneColumn' : 'editor.status.columns', { count: columns }) }}</span>
        <span class="badge badge-secondary">{{ t(rows === 1 ? 'editor.status.oneRow' : 'editor.status.rows', { count: rows }) }}</span>
      </div>
    </div>
  </div>
</template>
