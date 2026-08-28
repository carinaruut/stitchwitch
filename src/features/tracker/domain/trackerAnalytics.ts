import type { TrackerDailyGoal, TrackerSession, TrackerSessionArchive, TrackerTimer } from '../../../types/tracker'
import { trackerElapsedMilliseconds, trackerSessionNetStitches, trackerSessionProgress } from '../../../utils/tracker'

export const MIN_ESTIMATE_STITCHES = 10

export interface TrackerAnalyticsInput {
  now: number
  sessions: readonly TrackerSession[]
  sessionArchives: readonly TrackerSessionArchive[]
  timer: TrackerTimer
  completedCells: readonly string[]
  dailyGoal: TrackerDailyGoal | null
  totalCount: number
  completedCount: number
}

export interface TrackerAnalytics {
  totalDuration: number
  totalSessions: number
  totalStitches: number
  legacyDuration: number
  currentDuration: number
  currentProgress: { completed: number; reopened: number; net: number }
  todayDuration: number
  todayStitches: number
  goalProgress: number
  goalTargetValue: number
  goalPercentage: number
  remainingStitches: number
  estimatedWorkRemaining: number | null
  estimatedActiveDays: number | null
  estimatedGoalDays: number | null
  estimatedCompletion: Date | null
}

export function calculateTrackerAnalytics(input: TrackerAnalyticsInput): TrackerAnalytics {
  const allSessions = [
    ...input.sessions,
    ...input.sessionArchives.flatMap((archive) => archive.sessions),
  ]
  const recordedDuration = input.sessions.reduce((total, session) => total + session.durationMilliseconds, 0)
  const recordedStitches = input.sessions.reduce((total, session) => total + trackerSessionNetStitches(session), 0)
  const archivedDuration = input.sessionArchives.reduce((total, archive) => total + archive.elapsedMilliseconds, 0)
  const archivedSessions = input.sessionArchives.reduce((total, archive) => total + archive.sessions.length, 0)
  const archivedStitches = input.sessionArchives.reduce((total, archive) => total + sumSessionStitches(archive.sessions), 0)
  const currentDuration = input.timer.startedAt
    ? Math.max(0, input.now - Date.parse(input.timer.startedAt))
    : 0
  const currentProgress = input.timer.startedAt
    ? trackerSessionProgress(input.timer, input.completedCells)
    : { completed: 0, reopened: 0, net: 0 }
  const { todayStart, tomorrowStart } = localDayBounds(input.now)
  const activeDurationToday = input.timer.startedAt
    ? Math.max(0, input.now - Math.max(todayStart, Date.parse(input.timer.startedAt)))
    : 0
  const todayDuration = allSessions.reduce(
    (total, session) => total + durationWithinBounds(session, todayStart, tomorrowStart),
    0,
  ) + activeDurationToday
  const todayStitches = Math.max(0, allSessions.reduce((total, session) => {
    const endedAt = Date.parse(session.endedAt)
    return total + (endedAt >= todayStart && endedAt < tomorrowStart ? trackerSessionNetStitches(session) : 0)
  }, 0) + currentProgress.net)
  const goalProgress = input.dailyGoal?.type === 'time' ? todayDuration : todayStitches
  const goalTargetValue = input.dailyGoal?.type === 'time'
    ? input.dailyGoal.targetMinutes * 60_000
    : input.dailyGoal?.targetStitches ?? 0
  const speedDuration = allSessions.reduce((total, session) => total + session.durationMilliseconds, 0) + currentDuration
  const speedStitches = allSessions.reduce((total, session) => total + trackerSessionNetStitches(session), 0) + currentProgress.net
  const activeDays = countActiveDays(allSessions, currentProgress.net, input.now)
  const millisecondsPerStitch = speedStitches >= MIN_ESTIMATE_STITCHES && speedDuration > 0
    ? speedDuration / speedStitches
    : null
  const remainingStitches = Math.max(0, input.totalCount - input.completedCount)
  const estimatedWorkRemaining = millisecondsPerStitch === null ? null : remainingStitches * millisecondsPerStitch
  const estimatedActiveDays = activeDays > 0
    ? Math.ceil(remainingStitches / (speedStitches / activeDays))
    : null
  const estimatedActiveDayOffset = activeDays > 0
    ? calculateActiveDayOffset(remainingStitches, speedStitches, activeDays, todayStitches)
    : null
  const estimatedGoalDays = calculateGoalDays(input.dailyGoal, remainingStitches, estimatedWorkRemaining)
  const estimatedCompletion = calculateCompletionDate({
    now: input.now,
    goal: input.dailyGoal,
    goalProgress,
    remainingStitches,
    estimatedWorkRemaining,
    estimatedActiveDayOffset,
  })

  return {
    totalDuration: trackerElapsedMilliseconds(input.timer, input.now) + archivedDuration,
    totalSessions: input.sessions.length + archivedSessions,
    totalStitches: recordedStitches + archivedStitches,
    legacyDuration: Math.max(0, input.timer.elapsedMilliseconds - recordedDuration),
    currentDuration,
    currentProgress,
    todayDuration,
    todayStitches,
    goalProgress,
    goalTargetValue,
    goalPercentage: goalTargetValue > 0 ? Math.min(1, goalProgress / goalTargetValue) : 0,
    remainingStitches,
    estimatedWorkRemaining,
    estimatedActiveDays,
    estimatedGoalDays,
    estimatedCompletion,
  }
}

export function sumSessionStitches(sessions: readonly TrackerSession[]) {
  return sessions.reduce((total, session) => total + trackerSessionNetStitches(session), 0)
}

function durationWithinBounds(session: TrackerSession, start: number, end: number) {
  const startedAt = Date.parse(session.startedAt)
  const endedAt = Date.parse(session.endedAt)
  const wallDuration = endedAt - startedAt
  const overlap = Math.max(0, Math.min(endedAt, end) - Math.max(startedAt, start))
  return wallDuration > 0 ? Math.round(session.durationMilliseconds * overlap / wallDuration) : 0
}

function localDayBounds(now: number) {
  const date = new Date(now)
  const todayStart = new Date(date).setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(date).setHours(24, 0, 0, 0)
  return { todayStart, tomorrowStart }
}

function localDayKey(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function countActiveDays(sessions: readonly TrackerSession[], currentNet: number, now: number) {
  const days = new Set(sessions
    .filter((session) => trackerSessionNetStitches(session) !== 0)
    .map((session) => localDayKey(Date.parse(session.endedAt))))
  if (currentNet !== 0) days.add(localDayKey(now))
  return days.size
}

function calculateActiveDayOffset(remaining: number, stitches: number, activeDays: number, todayStitches: number) {
  const averageStitches = stitches / activeDays
  const availableToday = Math.max(0, averageStitches - todayStitches)
  return remaining <= availableToday ? 0 : Math.ceil((remaining - availableToday) / averageStitches)
}

function calculateGoalDays(goal: TrackerDailyGoal | null, remaining: number, estimatedWork: number | null) {
  if (!goal || estimatedWork === null) return null
  if (remaining === 0) return 0
  return Math.ceil(goal.type === 'stitches'
    ? remaining / goal.targetStitches
    : estimatedWork / (goal.targetMinutes * 60_000))
}

interface CompletionDateInput {
  now: number
  goal: TrackerDailyGoal | null
  goalProgress: number
  remainingStitches: number
  estimatedWorkRemaining: number | null
  estimatedActiveDayOffset: number | null
}

function calculateCompletionDate(input: CompletionDateInput) {
  if (input.estimatedWorkRemaining === null) return null
  if (!input.goal) {
    if (input.estimatedActiveDayOffset === null) return null
    return addLocalDays(input.now, input.estimatedActiveDayOffset)
  }
  const remaining = input.goal.type === 'stitches' ? input.remainingStitches : input.estimatedWorkRemaining
  const target = input.goal.type === 'stitches' ? input.goal.targetStitches : input.goal.targetMinutes * 60_000
  const availableToday = Math.max(0, target - input.goalProgress)
  const dayOffset = remaining <= availableToday ? 0 : Math.ceil((remaining - availableToday) / target)
  return addLocalDays(input.now, dayOffset)
}

function addLocalDays(now: number, days: number) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date
}
