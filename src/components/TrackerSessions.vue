<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrackerController } from '../composables/useProjects'
import { trackerElapsedMilliseconds } from '../utils/tracker'

const props = defineProps<{ now: number; state: TrackerController }>()
const { d, n, t } = useI18n({ useScope: 'global' })
const activeTracker = computed(() => props.state.tracker.value!)
const showPrevious = ref(false)
const sessions = computed(() => [...activeTracker.value.sessions].reverse())
const recordedDuration = computed(() => activeTracker.value.sessions.reduce((total, session) => total + session.durationMilliseconds, 0))
const recordedStitches = computed(() => activeTracker.value.sessions.reduce((total, session) => total + session.stitchesCompleted, 0))
const archives = computed(() => [...activeTracker.value.sessionArchives].reverse())
const archivedDuration = computed(() => activeTracker.value.sessionArchives.reduce((total, archive) => total + archive.elapsedMilliseconds, 0))
const archivedSessions = computed(() => activeTracker.value.sessionArchives.reduce((total, archive) => total + archive.sessions.length, 0))
const archivedStitches = computed(() => activeTracker.value.sessionArchives.reduce((total, archive) => (
  total + archive.sessions.reduce((sessionTotal, session) => sessionTotal + session.stitchesCompleted, 0)
), 0))
const totalDuration = computed(() => trackerElapsedMilliseconds(activeTracker.value.timer, props.now) + archivedDuration.value)
const totalSessions = computed(() => activeTracker.value.sessions.length + archivedSessions.value)
const totalStitches = computed(() => recordedStitches.value + archivedStitches.value)
const legacyDuration = computed(() => Math.max(0, activeTracker.value.timer.elapsedMilliseconds - recordedDuration.value))
const currentDuration = computed(() => activeTracker.value.timer.startedAt
  ? Math.max(0, props.now - Date.parse(activeTracker.value.timer.startedAt))
  : 0)
const currentStitches = computed(() => activeTracker.value.timer.startedAt
  ? Math.max(0, props.state.completedCount.value - (activeTracker.value.timer.sessionStartedCompletedCount ?? props.state.completedCount.value))
  : 0)

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="space-y-5">
    <dl class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
        <dt class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
          {{ t('tracker.sessions.totalTime') }}
        </dt>
        <dd class="mt-1 font-mono text-xl font-bold tabular-nums">
          {{ formatDuration(totalDuration) }}
        </dd>
      </div>
      <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
        <dt class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
          {{ t('tracker.sessions.totalSessions') }}
        </dt>
        <dd class="mt-1 text-xl font-bold tabular-nums">
          {{ n(totalSessions, 'integer') }}
        </dd>
      </div>
      <div class="rounded-box border border-base-300 bg-base-200/40 p-4">
        <dt class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
          {{ t('tracker.sessions.totalStitches') }}
        </dt>
        <dd class="mt-1 text-xl font-bold tabular-nums">
          {{ n(totalStitches, 'integer') }}
        </dd>
      </div>
    </dl>

    <div
      v-if="activeTracker.timer.startedAt"
      class="flex flex-wrap items-center justify-between gap-3 rounded-box border border-primary/30 bg-primary/10 p-4"
    >
      <div>
        <p class="font-semibold text-primary-content">
          {{ t('tracker.sessions.inProgress') }}
        </p>
        <p class="mt-1 text-sm text-base-content/65">
          {{ t('tracker.sessions.started', { date: d(new Date(activeTracker.timer.startedAt), 'short') }) }}
        </p>
      </div>
      <div class="text-right">
        <p class="font-mono font-bold tabular-nums">
          {{ formatDuration(currentDuration) }}
        </p>
        <p class="text-xs text-base-content/60">
          {{ t('tracker.sessions.stitches', { count: n(currentStitches, 'integer') }) }}
        </p>
      </div>
    </div>

    <div
      v-if="legacyDuration > 0"
      class="alert text-sm"
    >
      <span
        class="mdi mdi-history"
        aria-hidden="true"
      />
      <span>{{ t('tracker.sessions.legacyTime', { duration: formatDuration(legacyDuration) }) }}</span>
    </div>

    <div>
      <h3 class="text-sm font-semibold">
        {{ t('tracker.sessions.history') }}
      </h3>
      <p class="mt-1 text-xs text-base-content/60">
        {{ t('tracker.sessions.historyDescription') }}
      </p>
    </div>

    <p
      v-if="sessions.length === 0"
      class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/55"
    >
      {{ t('tracker.sessions.empty') }}
    </p>

    <ol
      v-else
      class="space-y-3"
    >
      <li
        v-for="session in sessions"
        :key="session.id"
        class="rounded-box border border-base-300 bg-base-200/40 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-semibold">
              {{ d(new Date(session.startedAt), 'short') }}
            </p>
            <p class="mt-1 text-xs text-base-content/60">
              <time :datetime="session.startedAt">{{ t('tracker.sessions.start', { date: d(new Date(session.startedAt), 'short') }) }}</time>
              <span aria-hidden="true"> · </span>
              <time :datetime="session.endedAt">{{ t('tracker.sessions.end', { date: d(new Date(session.endedAt), 'short') }) }}</time>
            </p>
          </div>
          <button
            class="btn btn-ghost btn-square btn-sm text-error"
            type="button"
            :aria-label="t('tracker.sessions.remove', { date: d(new Date(session.startedAt), 'short') })"
            :title="t('tracker.sessions.remove', { date: d(new Date(session.startedAt), 'short') })"
            @click="state.removeSession(session.id)"
          >
            <span
              class="mdi mdi-delete-outline"
              aria-hidden="true"
            />
          </button>
        </div>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-xs text-base-content/55">
              {{ t('tracker.sessions.duration') }}
            </dt>
            <dd class="mt-0.5 font-mono font-semibold tabular-nums">
              {{ formatDuration(session.durationMilliseconds) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-base-content/55">
              {{ t('tracker.sessions.completed') }}
            </dt>
            <dd class="mt-0.5 font-semibold tabular-nums">
              {{ n(session.stitchesCompleted, 'integer') }}
            </dd>
          </div>
        </dl>
      </li>
    </ol>

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
        class="space-y-4"
      >
        <article
          v-for="archive in archives"
          :key="archive.id"
          class="rounded-box border border-secondary/35 bg-secondary/10 p-4"
        >
          <header class="flex items-start justify-between gap-3">
            <div>
              <h4 class="font-semibold text-base-content">
                {{ t('tracker.sessions.previousGroup', { date: d(new Date(archive.archivedAt), 'short') }) }}
              </h4>
              <p class="mt-1 text-xs text-base-content/65">
                {{ t('tracker.sessions.groupSummary', {
                  duration: formatDuration(archive.elapsedMilliseconds),
                  sessions: n(archive.sessions.length, 'integer'),
                  stitches: n(archive.sessions.reduce((total, session) => total + session.stitchesCompleted, 0), 'integer'),
                }) }}
              </p>
            </div>
            <button
              class="btn btn-ghost btn-square btn-sm text-error"
              type="button"
              :aria-label="t('tracker.sessions.removePrevious', { date: d(new Date(archive.archivedAt), 'short') })"
              :title="t('tracker.sessions.removePrevious', { date: d(new Date(archive.archivedAt), 'short') })"
              @click="state.removeSessionArchive(archive.id)"
            >
              <span
                class="mdi mdi-delete-outline"
                aria-hidden="true"
              />
            </button>
          </header>

          <p
            v-if="archive.sessions.length === 0"
            class="mt-3 text-xs text-base-content/60"
          >
            {{ t('tracker.sessions.noSessionDetails') }}
          </p>
          <ol
            v-else
            class="mt-3 space-y-2"
          >
            <li
              v-for="session in [...archive.sessions].reverse()"
              :key="session.id"
              class="grid gap-2 rounded-box border border-secondary/25 bg-base-100/70 p-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
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
              <span class="font-mono font-semibold tabular-nums">{{ formatDuration(session.durationMilliseconds) }}</span>
              <span class="text-xs text-base-content/65">{{ t('tracker.sessions.stitches', { count: n(session.stitchesCompleted, 'integer') }) }}</span>
            </li>
          </ol>
        </article>
      </div>
    </template>
  </div>
</template>
