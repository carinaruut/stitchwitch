<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrackerSessionArchive } from '../../../../types/tracker'
import { trackerSessionNetStitches } from '../../../../utils/tracker'
import { sumSessionStitches } from '../../domain/trackerAnalytics'
import { formatSignedTrackerNumber, formatTrackerDuration } from '../../domain/trackerFormatters'

defineProps<{
  archives: readonly TrackerSessionArchive[]
  latestArchiveId: string | null
}>()
const emit = defineEmits<{
  restoreLatest: []
  remove: [archiveId: string]
  restoreSession: [archiveId: string, sessionId: string]
}>()
const { d, n, t } = useI18n({ useScope: 'global' })
const showPrevious = ref(false)
const formatSigned = (value: number) => formatSignedTrackerNumber(value, (number) => n(number, 'integer'))
</script>

<template>
  <template v-if="archives.length">
    <hr class="border-base-300">
    <button
      class="btn btn-ghost w-full justify-between"
      type="button"
      :aria-expanded="showPrevious"
      @click="showPrevious = !showPrevious"
    >
      <span class="flex items-center gap-2">
        <span
          class="mdi mdi-archive-clock-outline text-lg"
          aria-hidden="true"
        />
        {{ t(showPrevious ? 'tracker.sessions.hidePrevious' : 'tracker.sessions.showPrevious') }}
        <span class="badge badge-sm">{{ archives.length }}</span>
      </span>
      <span
        class="mdi"
        :class="showPrevious ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="showPrevious"
      class="app-page-stack"
    >
      <article
        v-for="archive in archives"
        :key="archive.id"
        class="app-settings-panel rounded-box border border-secondary/35 bg-secondary/10"
      >
        <header class="flex items-start justify-between gap-3">
          <div>
            <h4 class="font-semibold text-base-content">
              {{ t('tracker.sessions.previousGroup', { date: d(new Date(archive.archivedAt), 'short') }) }}
            </h4>
            <p class="mt-1 text-xs text-base-content/65">
              {{ t('tracker.sessions.groupSummary', {
                duration: formatTrackerDuration(archive.elapsedMilliseconds),
                sessions: n(archive.sessions.length, 'integer'),
                stitches: formatSigned(sumSessionStitches(archive.sessions)),
              }) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="archive.id === latestArchiveId"
              class="btn btn-ghost btn-sm"
              type="button"
              :title="t('tracker.sessions.restorePreviousDescription')"
              @click="emit('restoreLatest')"
            >
              <span
                class="mdi mdi-backup-restore text-lg"
                aria-hidden="true"
              />
              {{ t('tracker.sessions.restorePrevious') }}
            </button>
            <button
              class="btn btn-ghost btn-square btn-sm text-error"
              type="button"
              :aria-label="t('tracker.sessions.removePrevious', { date: d(new Date(archive.archivedAt), 'short') })"
              :title="t('tracker.sessions.removePrevious', { date: d(new Date(archive.archivedAt), 'short') })"
              @click="emit('remove', archive.id)"
            >
              <span
                class="mdi mdi-delete-outline"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        <p
          v-if="archive.sessions.length === 0"
          class="mt-3 text-xs text-base-content/60"
        >
          {{ t('tracker.sessions.noSessionDetails') }}
        </p>
        <ol
          v-else
          class="mt-3 grid gap-2"
        >
          <li
            v-for="session in [...archive.sessions].reverse()"
            :key="session.id"
            class="app-inset-panel grid gap-2 border-secondary/25 bg-base-100/70 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
          >
            <div>
              <time
                class="font-semibold"
                :datetime="session.startedAt"
              >{{ d(new Date(session.startedAt), 'short') }}</time>
              <p class="mt-0.5 text-xs text-base-content/55">
                {{ t('tracker.sessions.end', { date: d(new Date(session.endedAt), 'short') }) }}
              </p>
            </div>
            <span class="font-mono font-semibold tabular-nums">{{ formatTrackerDuration(session.durationMilliseconds) }}</span>
            <span class="text-xs text-base-content/65">
              {{ t('tracker.sessions.sessionProgress', {
                completed: formatSigned(session.stitchesCompleted),
                reopened: formatSigned(-session.stitchesReopened),
                net: formatSigned(trackerSessionNetStitches(session)),
              }) }}
            </span>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :title="t('tracker.sessions.restoreSessionDescription', { date: d(new Date(session.startedAt), 'short') })"
              @click="emit('restoreSession', archive.id, session.id)"
            >
              <span
                class="mdi mdi-backup-restore text-lg"
                aria-hidden="true"
              />
              {{ t('tracker.sessions.restoreSession') }}
            </button>
          </li>
        </ol>
      </article>
    </div>
  </template>
</template>
