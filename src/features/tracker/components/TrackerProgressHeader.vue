<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  autosaveStatus: 'saving' | 'saved' | 'error'
  completedCount: number
  name: string
  percentage: number
  totalCount: number
  updatedAt: string
}>()

const { d, n, t } = useI18n({ useScope: 'global' })
</script>

<template>
  <section class="card border border-base-300 bg-base-100">
    <div class="card-body app-card-body">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-primary-content">
            {{ t('tracker.progress.heading') }}
          </p>
          <h1 class="mt-1 text-2xl font-bold">
            {{ name }}
          </h1>
          <p class="mt-1 text-sm text-base-content/65">
            {{ t('tracker.progress.completed', { completed: n(completedCount, 'integer'), total: n(totalCount, 'integer') }) }}
          </p>
        </div>
        <span
          class="badge"
          :class="autosaveStatus === 'error' ? 'badge-error' : autosaveStatus === 'saving' ? 'badge-ghost' : 'badge-success badge-outline'"
        >
          <span
            class="mdi"
            :class="autosaveStatus === 'error' ? 'mdi-alert-circle-outline' : autosaveStatus === 'saving' ? 'mdi-loading mdi-spin' : 'mdi-content-save-check-outline'"
            aria-hidden="true"
          />
          {{ autosaveStatus === 'error' ? t('tracker.autosave.failed') : autosaveStatus === 'saving' ? t('tracker.autosave.saving') : t('tracker.autosave.saved') }}
        </span>
      </div>
      <progress
        class="progress progress-primary w-full"
        :value="completedCount"
        :max="totalCount"
      />
      <div class="flex items-center justify-between text-xs text-base-content/60">
        <span>{{ t('tracker.progress.percentComplete', { percentage: n(percentage / 100, 'percent') }) }}</span><span>{{ t('tracker.progress.updated', { date: d(new Date(updatedAt), 'short') }) }}</span>
      </div>
    </div>
  </section>
</template>
