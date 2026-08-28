<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrackerController } from '../../composables/useTracker'
import { trackerElapsedMilliseconds, trackerSessionProgress } from '../../../../utils/tracker'
import AppModal from '../../../../shared/ui/AppModal.vue'

const props = defineProps<{ name: string; state: TrackerController }>()
const { n, t } = useI18n({ useScope: 'global' })
const completedAt = ref<number | null>(null)
const activeTracker = computed(() => props.state.tracker.value!)
const completionSessions = computed(() => {
  const tracker = activeTracker.value
  const sessions = [
    ...tracker.sessions,
    ...tracker.sessionArchives.flatMap((archive) => archive.sessions),
  ].map((session) => ({ duration: session.durationMilliseconds, stitches: session.stitchesCompleted }))
  if (tracker.timer.startedAt && completedAt.value !== null) {
    const progress = trackerSessionProgress(tracker.timer, tracker.progress.completedCells)
    sessions.push({
      duration: Math.max(0, completedAt.value - Date.parse(tracker.timer.startedAt)),
      stitches: progress.completed,
    })
  }
  return sessions
})
const completionStats = computed(() => {
  if (completedAt.value === null) return null
  const tracker = activeTracker.value
  const overallTime = trackerElapsedMilliseconds(tracker.timer, completedAt.value)
    + tracker.sessionArchives.reduce((total, archive) => total + archive.elapsedMilliseconds, 0)
  if (overallTime <= 0) return null
  const sessions = completionSessions.value
  const sessionDuration = sessions.reduce((total, session) => total + session.duration, 0)
  const doneStitches = sessions.reduce((total, session) => total + session.stitches, 0)
  const longestSession = sessions.reduce((longest, session) => Math.max(longest, session.duration), 0)
  const mostStitches = sessions.reduce((most, session) => Math.max(most, session.stitches), 0)
  const fastestSession = sessions
    .filter((session) => session.stitches > 0)
    .reduce<(typeof sessions)[number] | null>((fastest, session) => {
      if (!fastest) return session
      const speed = session.duration === 0 ? Number.POSITIVE_INFINITY : session.stitches / session.duration
      const fastestSpeed = fastest.duration === 0 ? Number.POSITIVE_INFINITY : fastest.stitches / fastest.duration
      return speed > fastestSpeed ? session : fastest
    }, null)
  return {
    overallTime,
    doneStitches,
    sessionCount: sessions.length,
    averageSessionTime: sessions.length > 0 ? sessionDuration / sessions.length : null,
    longestSession: sessions.length > 0 ? longestSession : null,
    mostStitches: sessions.length > 0 ? mostStitches : null,
    fastestSession,
    averageTimePerStitch: doneStitches > 0 ? overallTime / doneStitches : null,
  }
})

watch([() => props.state.completedCount.value, () => props.state.totalCount.value], ([completed, total], [previousCompleted, previousTotal]) => {
  const wasComplete = previousTotal > 0 && previousCompleted === previousTotal
  if (total > 0 && completed === total && !wasComplete) completedAt.value = Date.now()
})

function formatDuration(milliseconds: number, precise = false) {
  const value = Math.max(0, milliseconds)
  const seconds = Math.floor(value / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const fraction = precise ? `.${String(Math.floor(value / 10) % 100).padStart(2, '0')}` : ''
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}${fraction}`
}
</script>

<template>
  <AppModal
    :open="completedAt !== null"
    :title="t('tracker.congratulations.title')"
    :description="t('tracker.congratulations.description', { name })"
    :close-label="t('tracker.congratulations.close')"
    size="md"
    :close-on-backdrop="false"
    @close="completedAt = null"
  >
    <div class="space-y-5">
      <div class="flex flex-col items-center rounded-box bg-success/10 px-5 py-7 text-center">
        <div class="grid size-16 place-items-center rounded-full bg-success text-success-content shadow-sm">
          <span
            class="mdi mdi-party-popper text-4xl"
            aria-hidden="true"
          />
        </div>
        <p class="mt-4 text-xl font-bold">
          {{ t('tracker.congratulations.patternComplete') }}
        </p>
        <p class="mt-1 text-sm text-base-content/65">
          {{ t('tracker.congratulations.patternStitches', { count: n(state.totalCount.value, 'integer') }) }}
        </p>
      </div>

      <section v-if="completionStats">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-widest text-base-content/55">
          {{ t('tracker.congratulations.stats') }}
        </h3>
        <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="col-span-2 rounded-box border border-primary/25 bg-primary/10 p-3 sm:col-span-4">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.overallTime') }}
            </dt>
            <dd class="mt-1 font-mono text-2xl font-bold tabular-nums">
              {{ formatDuration(completionStats.overallTime) }}
            </dd>
          </div>
          <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.doneStitches') }}
            </dt>
            <dd class="mt-1 text-lg font-bold tabular-nums">
              {{ n(completionStats.doneStitches, 'integer') }}
            </dd>
          </div>
          <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.sessionCount') }}
            </dt>
            <dd class="mt-1 text-lg font-bold tabular-nums">
              {{ n(completionStats.sessionCount, 'integer') }}
            </dd>
          </div>
          <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.averageSessionTime') }}
            </dt>
            <dd class="mt-1 font-mono text-sm font-bold tabular-nums">
              {{ completionStats.averageSessionTime === null ? t('tracker.congratulations.notAvailable') : formatDuration(completionStats.averageSessionTime) }}
            </dd>
          </div>
          <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.longestSession') }}
            </dt>
            <dd class="mt-1 font-mono text-sm font-bold tabular-nums">
              {{ completionStats.longestSession === null ? t('tracker.congratulations.notAvailable') : formatDuration(completionStats.longestSession) }}
            </dd>
          </div>
          <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.mostStitches') }}
            </dt>
            <dd class="mt-1 text-lg font-bold tabular-nums">
              {{ completionStats.mostStitches === null ? t('tracker.congratulations.notAvailable') : n(completionStats.mostStitches, 'integer') }}
            </dd>
          </div>
          <div class="rounded-box border border-base-300 bg-base-200/40 p-3">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.averageSpeed') }}
            </dt>
            <dd class="mt-1 font-mono text-sm font-bold tabular-nums">
              {{ completionStats.averageTimePerStitch === null ? t('tracker.congratulations.notAvailable') : t('tracker.congratulations.perStitch', { duration: formatDuration(completionStats.averageTimePerStitch, true) }) }}
            </dd>
          </div>
          <div class="col-span-2 rounded-box border border-base-300 bg-base-200/40 p-3 sm:col-span-4">
            <dt class="text-xs text-base-content/60">
              {{ t('tracker.congratulations.fastestSession') }}
            </dt>
            <dd class="mt-1 font-semibold">
              {{ completionStats.fastestSession
                ? t('tracker.congratulations.fastestSessionValue', {
                  stitches: n(completionStats.fastestSession.stitches, 'integer'),
                  duration: formatDuration(completionStats.fastestSession.duration),
                })
                : t('tracker.congratulations.notAvailable') }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
    <template #actions>
      <button
        class="btn btn-success"
        type="button"
        autofocus
        @click="completedAt = null"
      >
        {{ t('tracker.congratulations.action') }}
      </button>
    </template>
  </AppModal>
</template>
