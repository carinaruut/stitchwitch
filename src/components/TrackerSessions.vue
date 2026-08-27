<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TrackerController } from '../composables/useProjects'
import { MAX_TRACKER_DAILY_STITCH_GOAL, MAX_TRACKER_DAILY_TIME_GOAL_MINUTES, type TrackerDailyGoal, type TrackerSession } from '../types/tracker'
import { trackerElapsedMilliseconds } from '../utils/tracker'

const MIN_ESTIMATE_STITCHES = 10
const props = defineProps<{ now: number; state: TrackerController }>()
const { d, n, t } = useI18n({ useScope: 'global' })
const activeTracker = computed(() => props.state.tracker.value!)
const showPrevious = ref(false)
const sessions = computed(() => [...activeTracker.value.sessions].reverse())
const recordedDuration = computed(() => activeTracker.value.sessions.reduce((total, session) => total + session.durationMilliseconds, 0))
const recordedStitches = computed(() => activeTracker.value.sessions.reduce((total, session) => total + session.stitchesCompleted, 0))
const archives = computed(() => [...activeTracker.value.sessionArchives].reverse())
const latestArchiveId = computed(() => activeTracker.value.sessionArchives.at(-1)?.id ?? null)
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
const allSessions = computed(() => [
  ...activeTracker.value.sessions,
  ...activeTracker.value.sessionArchives.flatMap((archive) => archive.sessions),
])
const goalType = ref<TrackerDailyGoal['type']>(activeTracker.value.dailyGoal?.type ?? 'stitches')
const goalTarget = ref(activeTracker.value.dailyGoal?.type === 'time'
  ? activeTracker.value.dailyGoal.targetMinutes
  : activeTracker.value.dailyGoal?.targetStitches ?? 100)
const goalTargetMaximum = computed(() => goalType.value === 'stitches' ? MAX_TRACKER_DAILY_STITCH_GOAL : MAX_TRACKER_DAILY_TIME_GOAL_MINUTES)
const goalTargetValid = computed(() => Number.isSafeInteger(Number(goalTarget.value)) && Number(goalTarget.value) >= 1 && Number(goalTarget.value) <= goalTargetMaximum.value)
const todayStart = computed(() => new Date(new Date(props.now).setHours(0, 0, 0, 0)).getTime())
const tomorrowStart = computed(() => new Date(new Date(props.now).setHours(24, 0, 0, 0)).getTime())
const todayDuration = computed(() => allSessions.value.reduce((total, session) => total + durationWithinToday(session), 0) + activeDurationToday.value)
const todayStitches = computed(() => allSessions.value.reduce((total, session) => {
  const endedAt = Date.parse(session.endedAt)
  return total + (endedAt >= todayStart.value && endedAt < tomorrowStart.value ? session.stitchesCompleted : 0)
}, 0) + currentStitches.value)
const activeDurationToday = computed(() => activeTracker.value.timer.startedAt
  ? Math.max(0, props.now - Math.max(todayStart.value, Date.parse(activeTracker.value.timer.startedAt)))
  : 0)
const goalProgress = computed(() => activeTracker.value.dailyGoal?.type === 'time' ? todayDuration.value : todayStitches.value)
const goalTargetValue = computed(() => activeTracker.value.dailyGoal?.type === 'time'
  ? activeTracker.value.dailyGoal.targetMinutes * 60_000
  : activeTracker.value.dailyGoal?.targetStitches ?? 0)
const goalPercentage = computed(() => goalTargetValue.value > 0 ? Math.min(1, goalProgress.value / goalTargetValue.value) : 0)
const speedDuration = computed(() => allSessions.value.reduce((total, session) => total + session.durationMilliseconds, 0) + currentDuration.value)
const speedStitches = computed(() => allSessions.value.reduce((total, session) => total + session.stitchesCompleted, 0) + currentStitches.value)
const activeDays = computed(() => {
  const days = new Set(allSessions.value.filter((session) => session.stitchesCompleted > 0).map((session) => localDayKey(Date.parse(session.endedAt))))
  if (currentStitches.value > 0) days.add(localDayKey(props.now))
  return days.size
})
const millisecondsPerStitch = computed(() => speedStitches.value >= MIN_ESTIMATE_STITCHES && speedDuration.value > 0 ? speedDuration.value / speedStitches.value : null)
const remainingStitches = computed(() => Math.max(0, props.state.totalCount.value - props.state.completedCount.value))
const estimatedWorkRemaining = computed(() => millisecondsPerStitch.value === null ? null : remainingStitches.value * millisecondsPerStitch.value)
const estimatedActiveDays = computed(() => activeDays.value > 0
  ? Math.ceil(remainingStitches.value / (speedStitches.value / activeDays.value))
  : null)
const estimatedActiveDayOffset = computed(() => {
  if (activeDays.value === 0) return null
  const averageStitches = speedStitches.value / activeDays.value
  const availableToday = Math.max(0, averageStitches - todayStitches.value)
  return remainingStitches.value <= availableToday ? 0 : Math.ceil((remainingStitches.value - availableToday) / averageStitches)
})
const estimatedGoalDays = computed(() => {
  const goal = activeTracker.value.dailyGoal
  if (!goal || estimatedWorkRemaining.value === null) return null
  if (remainingStitches.value === 0) return 0
  return Math.ceil(goal.type === 'stitches'
    ? remainingStitches.value / goal.targetStitches
    : estimatedWorkRemaining.value / (goal.targetMinutes * 60_000))
})
const estimatedCompletion = computed(() => {
  const goal = activeTracker.value.dailyGoal
  if (estimatedWorkRemaining.value === null) return null
  if (!goal) {
    if (estimatedActiveDayOffset.value === null) return null
    const completion = new Date(props.now)
    completion.setDate(completion.getDate() + estimatedActiveDayOffset.value)
    return completion
  }
  const remaining = goal.type === 'stitches' ? remainingStitches.value : estimatedWorkRemaining.value
  const target = goal.type === 'stitches' ? goal.targetStitches : goal.targetMinutes * 60_000
  const availableToday = Math.max(0, target - goalProgress.value)
  const dayOffset = remaining <= availableToday ? 0 : Math.ceil((remaining - availableToday) / target)
  const completion = new Date(props.now)
  completion.setDate(completion.getDate() + dayOffset)
  return completion
})

watch(() => activeTracker.value.dailyGoal, (goal) => {
  if (!goal) return
  goalType.value = goal.type
  goalTarget.value = goal.type === 'time' ? goal.targetMinutes : goal.targetStitches
})

function durationWithinToday(session: TrackerSession) {
  const startedAt = Date.parse(session.startedAt)
  const endedAt = Date.parse(session.endedAt)
  const wallDuration = endedAt - startedAt
  const overlap = Math.max(0, Math.min(endedAt, tomorrowStart.value) - Math.max(startedAt, todayStart.value))
  return wallDuration > 0 ? Math.round(session.durationMilliseconds * overlap / wallDuration) : 0
}

function localDayKey(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function saveGoal() {
  if (!goalTargetValid.value) return
  const target = Number(goalTarget.value)
  props.state.setDailyGoal(goalType.value === 'time'
    ? { type: 'time', targetMinutes: target }
    : { type: 'stitches', targetStitches: target })
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-box border border-primary/25 bg-primary/10 p-4">
      <div class="flex items-start gap-3">
        <span
          class="mdi mdi-target text-2xl text-primary"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold">
            {{ t('tracker.goals.title') }}
          </h3>
          <p class="mt-1 text-xs text-base-content/60">
            {{ t('tracker.goals.description') }}
          </p>
        </div>
      </div>

      <form
        class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        @submit.prevent="saveGoal"
      >
        <label class="form-control gap-1">
          <span class="text-xs font-semibold">{{ t('tracker.goals.metric') }}</span>
          <select
            v-model="goalType"
            class="select select-bordered select-sm w-full"
          >
            <option value="stitches">{{ t('tracker.goals.stitches') }}</option>
            <option value="time">{{ t('tracker.goals.time') }}</option>
          </select>
        </label>
        <label class="form-control gap-1">
          <span class="text-xs font-semibold">{{ t(goalType === 'time' ? 'tracker.goals.minutesPerDay' : 'tracker.goals.stitchesPerDay') }}</span>
          <input
            v-model.number="goalTarget"
            class="input input-bordered input-sm w-full"
            type="number"
            min="1"
            :max="goalTargetMaximum"
            step="1"
            required
          >
        </label>
        <button
          class="btn btn-primary btn-sm"
          type="submit"
          :disabled="!goalTargetValid"
        >
          {{ t(activeTracker.dailyGoal ? 'tracker.goals.update' : 'tracker.goals.set') }}
        </button>
      </form>

      <template v-if="activeTracker.dailyGoal">
        <div class="mt-4 flex items-end justify-between gap-3 text-sm">
          <div>
            <p class="font-semibold">
              {{ t('tracker.goals.today') }}
            </p>
            <p class="mt-0.5 text-xs text-base-content/60">
              {{ activeTracker.dailyGoal.type === 'time'
                ? t('tracker.goals.timeProgress', { current: formatDuration(todayDuration), target: formatDuration(goalTargetValue) })
                : t('tracker.goals.stitchProgress', { current: n(todayStitches, 'integer'), target: n(goalTargetValue, 'integer') }) }}
            </p>
          </div>
          <span class="font-bold tabular-nums">{{ n(goalPercentage, 'percent') }}</span>
        </div>
        <progress
          class="progress progress-primary mt-2 w-full"
          :value="goalProgress"
          :max="goalTargetValue"
        />
        <div class="mt-4 flex justify-end border-t border-primary/20 pt-4">
          <button
            class="btn btn-ghost btn-sm text-error"
            type="button"
            @click="state.setDailyGoal(null)"
          >
            {{ t('tracker.goals.remove') }}
          </button>
        </div>
      </template>
    </section>

    <section class="rounded-box border border-base-300 bg-base-200/40 p-4">
      <div class="flex items-start gap-3">
        <span
          class="mdi mdi-calendar-clock-outline text-2xl text-secondary"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-base-content/55">
            {{ t('tracker.goals.estimate') }}
          </p>
          <template v-if="estimatedWorkRemaining !== null && estimatedCompletion">
            <p class="mt-1 font-semibold">
              {{ remainingStitches === 0
                ? t('tracker.goals.complete')
                : t('tracker.goals.estimatedCompletion', { date: d(estimatedCompletion, 'short') }) }}
            </p>
            <p
              v-if="remainingStitches > 0"
              class="mt-0.5 text-xs text-base-content/60"
            >
              {{ activeTracker.dailyGoal
                ? t('tracker.goals.workRemaining', { duration: formatDuration(estimatedWorkRemaining), days: n(estimatedGoalDays ?? 0, 'integer') })
                : t('tracker.goals.workRemainingActiveDays', { duration: formatDuration(estimatedWorkRemaining), days: n(estimatedActiveDays ?? 0, 'integer') }) }}
            </p>
            <p class="mt-1 text-xs text-base-content/50">
              {{ t(activeTracker.dailyGoal ? 'tracker.goals.estimateBasis' : 'tracker.goals.activeDayBasis') }}
            </p>
          </template>
          <p
            v-else
            class="mt-1 text-xs text-base-content/60"
          >
            {{ t('tracker.goals.needsSessions', { count: n(MIN_ESTIMATE_STITCHES, 'integer') }) }}
          </p>
        </div>
      </div>
    </section>

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
            <div class="flex shrink-0 items-center gap-1">
              <button
                v-if="archive.id === latestArchiveId"
                class="btn btn-ghost btn-sm"
                type="button"
                :title="t('tracker.sessions.restorePreviousDescription')"
                @click="state.restoreLastSessionArchive()"
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
                @click="state.removeSessionArchive(archive.id)"
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
