<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppModal from '../../../shared/ui/AppModal.vue'

defineProps<{ open: boolean }>()
defineEmits<{ create: []; load: []; cancel: [] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <AppModal
    :open="open"
    :title="t('editor.tabs.chooseTitle')"
    :description="t('editor.tabs.chooseDescription')"
    :close-label="t('editor.modal.closeDialog')"
    :backdrop-label="t('editor.modal.close')"
    size="md"
    :show-close-button="false"
    @close="$emit('cancel')"
  >
    <div class="grid gap-3 sm:grid-cols-2">
      <button
        class="card border border-base-300 bg-base-100 text-left transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
        type="button"
        autofocus
        @click="$emit('create')"
      >
        <span class="card-body gap-3 p-5">
          <span class="grid size-11 place-items-center rounded-box bg-primary/10 text-primary">
            <span
              class="mdi mdi-file-plus-outline text-2xl"
              aria-hidden="true"
            />
          </span>
          <span>
            <span class="block font-semibold">{{ t('editor.tabs.createTitle') }}</span>
            <span class="mt-1 block text-sm text-base-content/65">{{ t('editor.tabs.createDescription') }}</span>
          </span>
        </span>
      </button>
      <button
        class="card border border-base-300 bg-base-100 text-left transition hover:border-secondary hover:bg-secondary/5 focus-visible:outline-2 focus-visible:outline-secondary"
        type="button"
        @click="$emit('load')"
      >
        <span class="card-body gap-3 p-5">
          <span class="grid size-11 place-items-center rounded-box bg-secondary/10 text-secondary">
            <span
              class="mdi mdi-folder-open-outline text-2xl"
              aria-hidden="true"
            />
          </span>
          <span>
            <span class="block font-semibold">{{ t('editor.tabs.loadTitle') }}</span>
            <span class="mt-1 block text-sm text-base-content/65">{{ t('editor.tabs.loadDescription') }}</span>
          </span>
        </span>
      </button>
    </div>
    <template #actions>
      <button
        class="btn"
        type="button"
        @click="$emit('cancel')"
      >
        {{ t('editor.modal.cancel') }}
      </button>
    </template>
  </AppModal>
</template>
