<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ProjectSession } from '../composables/useProjects'

defineProps<{ sessions: ProjectSession[]; activeProjectId: string }>()
defineEmits<{ activate: [id: string]; close: [id: string]; create: [] }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="relative bg-base-100 px-3 pt-2 sm:px-5">
    <span
      class="pointer-events-none absolute inset-x-0 bottom-px h-px bg-base-300"
      aria-hidden="true"
    />
    <div class="mx-auto max-w-360 overflow-x-auto">
      <div
        class="tabs tabs-lift relative z-10 w-max shrink-0 flex-nowrap"
        role="tablist"
        :aria-label="t('editor.tabs.label')"
      >
        <div
          v-for="session in sessions"
          :id="`project-tab-${session.id}`"
          :key="session.id"
          class="tab relative h-10 max-w-64 shrink-0 gap-1 px-2"
          :class="session.id === activeProjectId ? 'tab-active' : ''"
          role="tab"
          aria-controls="project-workspace"
          :aria-label="session.pattern.project.value.name"
          :aria-selected="session.id === activeProjectId"
          :tabindex="session.id === activeProjectId ? 0 : -1"
          :title="session.pattern.project.value.name"
          @click="$emit('activate', session.id)"
          @keydown.enter.prevent="$emit('activate', session.id)"
          @keydown.space.prevent="$emit('activate', session.id)"
        >
          <span class="min-w-0 flex-1 truncate px-1 text-left">{{ session.pattern.project.value.name }}</span>
          <button
            class="btn btn-ghost btn-circle btn-xs shrink-0"
            type="button"
            :aria-label="t('editor.tabs.close', { name: session.pattern.project.value.name })"
            :title="t('editor.tabs.close', { name: session.pattern.project.value.name })"
            @click.stop="$emit('close', session.id)"
          >
            <span
              class="mdi mdi-close"
              aria-hidden="true"
            />
          </button>
        </div>
        <button
          class="tab h-10 shrink-0 px-3"
          type="button"
          role="tab"
          aria-selected="false"
          :aria-label="t('editor.tabs.new')"
          :title="t('editor.tabs.new')"
          @click="$emit('create')"
        >
          <span
            class="mdi mdi-plus text-lg"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </div>
</template>
