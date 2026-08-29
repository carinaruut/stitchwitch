<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectExportMenuItems from '../../features/export/components/ProjectExportMenuItems.vue'
import AppDropdown from '../../shared/ui/AppDropdown.vue'
import type { PrintMode, WrittenInstructionFormat } from '../../types/pattern'

defineProps<{ includeAnnotations: boolean }>()
const emit = defineEmits<{
  new: []
  open: []
  save: []
  png: []
  print: [mode: PrintMode]
  instructions: [format: WrittenInstructionFormat]
  'update:includeAnnotations': [value: boolean]
}>()
const { t } = useI18n({ useScope: 'global' })
const dropdown = ref<InstanceType<typeof AppDropdown> | null>(null)

function request(action: () => void) {
  dropdown.value?.close(true)
  action()
}
</script>

<template>
  <AppDropdown
    ref="dropdown"
    class="lg:hidden"
    :label="t('editor.nav.moreActions')"
    align="right"
    panel-role="menu"
  >
    <template #trigger="{ open, panelId }">
      <button
        class="btn btn-ghost btn-square btn-sm"
        type="button"
        :aria-label="t('editor.nav.moreActions')"
        aria-haspopup="menu"
        :aria-controls="panelId"
        :aria-expanded="open"
      >
        <span
          class="mdi mdi-dots-vertical text-lg"
          aria-hidden="true"
        />
      </button>
    </template>
    <ul class="menu app-menu w-64">
      <li>
        <button
          type="button"
          @click="request(() => emit('new'))"
        >
          <span
            class="mdi mdi-file-plus-outline"
            aria-hidden="true"
          />{{ t('editor.nav.newProject') }}
        </button>
      </li>
      <li>
        <button
          type="button"
          @click="request(() => emit('open'))"
        >
          <span
            class="mdi mdi-folder-open-outline"
            aria-hidden="true"
          />{{ t('editor.nav.openProject') }}
        </button>
      </li>
      <li>
        <button
          type="button"
          aria-keyshortcuts="Control+S Meta+S"
          @click="request(() => emit('save'))"
        >
          <span
            class="mdi mdi-content-save-outline"
            aria-hidden="true"
          />{{ t('editor.nav.saveProject') }}
        </button>
      </li>
      <ProjectExportMenuItems
        :include-annotations="includeAnnotations"
        show-title
        @update:include-annotations="emit('update:includeAnnotations', $event)"
        @png="request(() => emit('png'))"
        @print="request(() => emit('print', $event))"
        @instructions="request(() => emit('instructions', $event))"
      />
    </ul>
  </AppDropdown>
</template>
