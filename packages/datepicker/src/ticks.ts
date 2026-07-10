import {
  addCalendarDays,
  fromDayOrdinal,
  inclusiveDayCount,
  normalizeRange,
  toDayOrdinal,
} from "./date-math"
import type {
  DateRange,
  TickFormatContext,
  TickInterval,
  TimelineDateAlignment,
  TimelineTick,
  WeekStartsOn,
} from "./types"

export const DEFAULT_TICK_INTERVALS: readonly TickInterval[] = Object.freeze([
  { unit: "day", step: 1 },
  { unit: "day", step: 2 },
  { unit: "day", step: 3 },
  { unit: "week", step: 1 },
  { unit: "week", step: 2 },
  { unit: "month", step: 1 },
  { unit: "month", step: 2 },
  { unit: "month", step: 3 },
  { unit: "month", step: 6 },
  { unit: "year", step: 1 },
  { unit: "year", step: 2 },
  { unit: "year", step: 5 },
  { unit: "year", step: 10 },
  { unit: "year", step: 25 },
  { unit: "year", step: 50 },
])

export interface TickCandidateOptions {
  weekStartsOn?: WeekStartsOn
  includeBoundaries?: boolean
  maxCandidates?: number
}

export interface ResponsiveTickOptions extends TickCandidateOptions {
  locale?: TickFormatContext["locale"]
  minGap?: number
  intervals?: readonly TickInterval[]
  formatTick?: (date: Date, context: TickFormatContext) => string
  measureText?: (label: string) => number
}

export interface TimelineScale {
  x: (date: Date, align?: TimelineDateAlignment) => number
  dateAt: (x: number) => Date
  dayWidth: number
}

function assertWidth(width: number): void {
  if (!Number.isFinite(width) || width < 0) {
    throw new RangeError("width must be a non-negative finite number")
  }
}

function assertInterval(interval: TickInterval): void {
  if (!Number.isSafeInteger(interval.step) || interval.step < 1) {
    throw new RangeError("tick interval step must be a positive integer")
  }
}

/** Map an inclusive local day cell to its start, center, or end pixel. */
export function dateToX(
  date: Date,
  viewport: DateRange,
  width: number,
  align: TimelineDateAlignment = "center",
): number {
  assertWidth(width)
  const normalized = normalizeRange(viewport)
  const days = inclusiveDayCount(normalized)
  const dayWidth = days === 0 ? 0 : width / days
  const index = toDayOrdinal(date) - toDayOrdinal(normalized.from)
  const alignmentOffset = align === "start" ? 0 : align === "end" ? 1 : 0.5
  return (index + alignmentOffset) * dayWidth
}

/** Snap a pixel to the local calendar day cell beneath it. */
export function xToDate(
  x: number,
  viewport: DateRange,
  width: number,
): Date {
  assertWidth(width)
  if (!Number.isFinite(x)) {
    throw new RangeError("x must be finite")
  }
  const normalized = normalizeRange(viewport)
  const days = inclusiveDayCount(normalized)
  if (width === 0) return normalized.from
  const clampedX = Math.min(width, Math.max(0, x))
  const index = Math.min(days - 1, Math.floor((clampedX / width) * days))
  return addCalendarDays(normalized.from, index)
}

export function createTimelineScale(
  viewport: DateRange,
  width: number,
): TimelineScale {
  assertWidth(width)
  const normalized = normalizeRange(viewport)
  const dayWidth = width / inclusiveDayCount(normalized)
  return {
    x: (date, align) => dateToX(date, normalized, width, align),
    dateAt: x => xToDate(x, normalized, width),
    dayWidth,
  }
}

export function pixelsToDayDelta(
  pixels: number,
  viewport: DateRange,
  width: number,
): number {
  assertWidth(width)
  if (!Number.isFinite(pixels)) {
    throw new RangeError("pixels must be finite")
  }
  if (width === 0) return 0
  return Math.round((pixels / width) * inclusiveDayCount(viewport))
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function firstAlignedDay(fromOrdinal: number, step: number): number {
  const remainder = positiveModulo(fromOrdinal, step)
  return remainder === 0 ? fromOrdinal : fromOrdinal + step - remainder
}

function firstAlignedWeek(
  fromOrdinal: number,
  step: number,
  weekStartsOn: WeekStartsOn,
): number {
  // 1970-01-04 was a Sunday. Adding weekStartsOn yields a stable local-date
  // ordinal for the configured start of week.
  const epochWeekStart = 3 + weekStartsOn
  const intervalDays = step * 7
  const remainder = positiveModulo(fromOrdinal - epochWeekStart, intervalDays)
  return remainder === 0
    ? fromOrdinal
    : fromOrdinal + intervalDays - remainder
}

function firstAlignedMonth(from: Date, step: number): Date {
  let year = from.getFullYear()
  let month = from.getMonth()
  if (from.getDate() !== 1) month += 1

  let monthIndex = year * 12 + month
  const remainder = positiveModulo(monthIndex, step)
  if (remainder !== 0) monthIndex += step - remainder
  year = Math.floor(monthIndex / 12)
  month = positiveModulo(monthIndex, 12)

  const result = new Date(0)
  result.setHours(0, 0, 0, 0)
  result.setFullYear(year, month, 1)
  return result
}

function firstAlignedYear(from: Date, step: number): Date {
  let year = from.getFullYear()
  if (from.getMonth() !== 0 || from.getDate() !== 1) year += 1
  const remainder = positiveModulo(year, step)
  if (remainder !== 0) year += step - remainder

  const result = new Date(0)
  result.setHours(0, 0, 0, 0)
  result.setFullYear(year, 0, 1)
  return result
}

function addMonths(date: Date, amount: number): Date {
  const monthIndex = date.getFullYear() * 12 + date.getMonth() + amount
  const result = new Date(0)
  result.setHours(0, 0, 0, 0)
  result.setFullYear(
    Math.floor(monthIndex / 12),
    positiveModulo(monthIndex, 12),
    1,
  )
  return result
}

function addYears(date: Date, amount: number): Date {
  const result = new Date(0)
  result.setHours(0, 0, 0, 0)
  result.setFullYear(date.getFullYear() + amount, 0, 1)
  return result
}

function addUniqueDate(target: Map<number, Date>, date: Date): void {
  target.set(toDayOrdinal(date), date)
}

/** Generate dates aligned to calendar days, weeks, months, or years. */
export function generateTickCandidates(
  viewport: DateRange,
  interval: TickInterval,
  options: TickCandidateOptions = {},
): Date[] {
  assertInterval(interval)
  const normalized = normalizeRange(viewport)
  const fromOrdinal = toDayOrdinal(normalized.from)
  const toOrdinal = toDayOrdinal(normalized.to)
  const weekStartsOn = options.weekStartsOn ?? 1
  const maxCandidates = options.maxCandidates ?? 10_000
  if (!Number.isSafeInteger(maxCandidates) || maxCandidates < 1) {
    throw new RangeError("maxCandidates must be a positive integer")
  }

  const candidates = new Map<number, Date>()
  if (options.includeBoundaries ?? true) {
    addUniqueDate(candidates, normalized.from)
    addUniqueDate(candidates, normalized.to)
  }

  const push = (date: Date): boolean => {
    const ordinal = toDayOrdinal(date)
    if (ordinal >= fromOrdinal && ordinal <= toOrdinal) {
      addUniqueDate(candidates, date)
    }
    return candidates.size <= maxCandidates
  }

  if (interval.unit === "day" || interval.unit === "week") {
    const stepDays = interval.step * (interval.unit === "week" ? 7 : 1)
    let ordinal =
      interval.unit === "week"
        ? firstAlignedWeek(fromOrdinal, interval.step, weekStartsOn)
        : firstAlignedDay(fromOrdinal, interval.step)
    while (ordinal <= toOrdinal) {
      if (!push(fromDayOrdinal(ordinal))) break
      ordinal += stepDays
    }
  } else {
    let date =
      interval.unit === "month"
        ? firstAlignedMonth(normalized.from, interval.step)
        : firstAlignedYear(normalized.from, interval.step)
    while (toDayOrdinal(date) <= toOrdinal) {
      if (!push(date)) break
      date =
        interval.unit === "month"
          ? addMonths(date, interval.step)
          : addYears(date, interval.step)
    }
  }

  return [...candidates.values()].sort(
    (left, right) => toDayOrdinal(left) - toDayOrdinal(right),
  )
}

function defaultFormatTick(
  date: Date,
  context: TickFormatContext,
): string {
  const locale = context.locale?.code
  const spansYears =
    context.viewport.from.getFullYear() !== context.viewport.to.getFullYear()

  if (context.interval.unit === "year") {
    return new Intl.DateTimeFormat(locale, { year: "numeric" }).format(date)
  }
  if (context.interval.unit === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      ...(spansYears ? { year: "numeric" as const } : {}),
    }).format(date)
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    ...(spansYears ? { year: "numeric" as const } : {}),
  }).format(date)
}

function approximateTextWidth(label: string): number {
  return Math.max(24, label.length * 7.2)
}

function intervalApproximateDays(interval: TickInterval): number {
  switch (interval.unit) {
    case "day":
      return interval.step
    case "week":
      return interval.step * 7
    case "month":
      return interval.step * 30.4375
    case "year":
      return interval.step * 365.25
  }
}

function tickAlignment(
  ordinal: number,
  firstOrdinal: number,
  lastOrdinal: number,
): TimelineDateAlignment {
  if (ordinal === firstOrdinal) return "start"
  if (ordinal === lastOrdinal) return "end"
  return "center"
}

function layoutTicks(
  dates: readonly Date[],
  viewport: DateRange,
  width: number,
  interval: TickInterval,
  options: ResponsiveTickOptions,
): TimelineTick[] {
  const formatTick = options.formatTick ?? defaultFormatTick
  const normalized = normalizeRange(viewport)
  const firstOrdinal = toDayOrdinal(normalized.from)
  const lastOrdinal = toDayOrdinal(normalized.to)
  return dates.map(date => {
    const ordinal = toDayOrdinal(date)
    const align = tickAlignment(ordinal, firstOrdinal, lastOrdinal)
    return {
      date,
      label: formatTick(date, {
        interval,
        locale: options.locale,
        viewport: normalized,
      }),
      position: dateToX(date, normalized, width, align),
      interval,
      align,
      isBoundary: ordinal === firstOrdinal || ordinal === lastOrdinal,
    }
  })
}

function ticksDoNotCollide(
  ticks: readonly TimelineTick[],
  width: number,
  minGap: number,
  measureText: (label: string) => number,
): boolean {
  let previousRight = Number.NEGATIVE_INFINITY
  for (const tick of ticks) {
    const labelWidth = Math.max(0, measureText(tick.label))
    const left =
      tick.align === "start"
        ? tick.position
        : tick.align === "end"
          ? tick.position - labelWidth
          : tick.position - labelWidth / 2
    const right = left + labelWidth
    if (left < -0.5 || right > width + 0.5 || left - previousRight < minGap) {
      return false
    }
    previousRight = right
  }
  return true
}

function ticksCollide(
  leftTick: TimelineTick,
  rightTick: TimelineTick,
  minGap: number,
  measureText: (label: string) => number,
): boolean {
  const leftWidth = Math.max(0, measureText(leftTick.label))
  const rightWidth = Math.max(0, measureText(rightTick.label))
  const leftRight = leftTick.align === "end"
    ? leftTick.position
    : leftTick.align === "start"
      ? leftTick.position + leftWidth
      : leftTick.position + leftWidth / 2
  const rightLeft = rightTick.align === "start"
    ? rightTick.position
    : rightTick.align === "end"
      ? rightTick.position - rightWidth
      : rightTick.position - rightWidth / 2

  return rightLeft - leftRight < minGap
}

/**
 * Viewport boundaries are useful context, but they are not part of the
 * calendar cadence. If one lands close to the first or last aligned tick,
 * remove only that adjacent tick instead of rejecting the whole interval.
 */
function trimBoundaryCollisions(
  ticks: readonly TimelineTick[],
  minGap: number,
  measureText: (label: string) => number,
): TimelineTick[] {
  const result = [...ticks]
  const hadInteriorTick = result.some(tick => !tick.isBoundary)

  if (
    result.length < 3 ||
    !result[0]?.isBoundary ||
    !result.at(-1)?.isBoundary
  ) {
    return result
  }

  while (
    result.length > 2 &&
    ticksCollide(result[0]!, result[1]!, minGap, measureText)
  ) {
    result.splice(1, 1)
  }

  while (
    result.length > 2 &&
    ticksCollide(result.at(-2)!, result.at(-1)!, minGap, measureText)
  ) {
    result.splice(-2, 1)
  }

  return hadInteriorTick && result.every(tick => tick.isBoundary) ? [...ticks] : result
}

/**
 * Select the densest calendar-aligned interval whose measured labels fit.
 * `measureText` can be backed by canvas or actual DOM measurements; the
 * built-in approximation keeps SSR and first paint deterministic.
 */
export function selectResponsiveTicks(
  viewport: DateRange,
  width: number,
  options: ResponsiveTickOptions = {},
): TimelineTick[] {
  assertWidth(width)
  if (width === 0) return []
  const normalized = normalizeRange(viewport)
  const spanDays = inclusiveDayCount(normalized)
  const minGap = options.minGap ?? 12
  const measureText = options.measureText ?? approximateTextWidth
  const intervals = options.intervals ?? DEFAULT_TICK_INTERVALS
  if (!Number.isFinite(minGap) || minGap < 0) {
    throw new RangeError("minGap must be a non-negative finite number")
  }

  for (const interval of intervals) {
    assertInterval(interval)
    const approximateCount = spanDays / intervalApproximateDays(interval)
    if (approximateCount > Math.max(1_000, width / 2)) continue
    const dates = generateTickCandidates(normalized, interval, options)
    const ticks = trimBoundaryCollisions(
      layoutTicks(dates, normalized, width, interval, options),
      minGap,
      measureText,
    )
    if (ticksDoNotCollide(ticks, width, minGap, measureText)) return ticks
  }

  // The endpoints are useful even when no interior interval fits. Preserve
  // both if possible, otherwise keep the leading boundary without overlap.
  const fallbackInterval =
    intervals.at(-1) ?? ({ unit: "year", step: 100 } satisfies TickInterval)
  const boundaries = layoutTicks(
    [normalized.from, normalized.to],
    normalized,
    width,
    fallbackInterval,
    options,
  ).filter(
    (tick, index, ticks) =>
      index === 0 || toDayOrdinal(tick.date) !== toDayOrdinal(ticks[0]!.date),
  )
  return ticksDoNotCollide(boundaries, width, minGap, measureText)
    ? boundaries
    : boundaries.slice(0, 1)
}
