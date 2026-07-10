import type { DateRange } from "./types"

export const MILLISECONDS_PER_DAY = 86_400_000

function assertValidDate(date: Date, name = "date"): void {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid Date`)
  }
}

function assertValidBounds(minDate?: Date, maxDate?: Date): void {
  if (minDate) assertValidDate(minDate, "minDate")
  if (maxDate) assertValidDate(maxDate, "maxDate")
  if (minDate && maxDate && toDayOrdinal(minDate) > toDayOrdinal(maxDate)) {
    throw new RangeError("minDate must be on or before maxDate")
  }
}

/** Return a new Date at the start of the same local calendar day. */
export function startOfCalendarDay(date: Date): Date {
  assertValidDate(date)
  const result = new Date(date.getTime())
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Convert a local calendar date to a timezone-independent integer ordinal.
 *
 * The UTC timestamp is created from the *local* year/month/day fields. This
 * makes subtraction immune to 23- and 25-hour daylight-saving days.
 */
export function toDayOrdinal(date: Date): number {
  assertValidDate(date)
  const utcDate = new Date(0)
  utcDate.setUTCHours(0, 0, 0, 0)
  utcDate.setUTCFullYear(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  return Math.trunc(utcDate.getTime() / MILLISECONDS_PER_DAY)
}

/** Convert an ordinal returned by {@link toDayOrdinal} to local day start. */
export function fromDayOrdinal(ordinal: number): Date {
  if (!Number.isSafeInteger(ordinal)) {
    throw new RangeError("ordinal must be a safe integer")
  }

  const utcDate = new Date(ordinal * MILLISECONDS_PER_DAY)
  const result = new Date(0)
  result.setHours(0, 0, 0, 0)
  result.setFullYear(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
  )
  return result
}

/** Add local calendar days without adding fixed 24-hour durations. */
export function addCalendarDays(date: Date, amount: number): Date {
  if (!Number.isFinite(amount)) {
    throw new RangeError("amount must be finite")
  }
  return fromDayOrdinal(toDayOrdinal(date) + Math.trunc(amount))
}

/** Signed number of calendar-day boundaries from `earlier` to `later`. */
export function differenceInCalendarDays(later: Date, earlier: Date): number {
  return toDayOrdinal(later) - toDayOrdinal(earlier)
}

export function compareCalendarDays(left: Date, right: Date): -1 | 0 | 1 {
  const difference = differenceInCalendarDays(left, right)
  return difference === 0 ? 0 : difference < 0 ? -1 : 1
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return toDayOrdinal(left) === toDayOrdinal(right)
}

/** Normalize order, time, and object identity for an inclusive date range. */
export function normalizeRange(range: DateRange): DateRange {
  const fromOrdinal = toDayOrdinal(range.from)
  const toOrdinal = toDayOrdinal(range.to)
  return fromOrdinal <= toOrdinal
    ? { from: fromDayOrdinal(fromOrdinal), to: fromDayOrdinal(toOrdinal) }
    : { from: fromDayOrdinal(toOrdinal), to: fromDayOrdinal(fromOrdinal) }
}

/** Count both endpoints. A single-day range therefore has length one. */
export function inclusiveDayCount(range: DateRange): number {
  const normalized = normalizeRange(range)
  return differenceInCalendarDays(normalized.to, normalized.from) + 1
}

export function rangesEqual(left: DateRange, right: DateRange): boolean {
  return (
    isSameCalendarDay(left.from, right.from) &&
    isSameCalendarDay(left.to, right.to)
  )
}

export function rangeContainsDate(range: DateRange, date: Date): boolean {
  const normalized = normalizeRange(range)
  const ordinal = toDayOrdinal(date)
  return (
    ordinal >= toDayOrdinal(normalized.from) &&
    ordinal <= toDayOrdinal(normalized.to)
  )
}

export function shiftRange(range: DateRange, amount: number): DateRange {
  const normalized = normalizeRange(range)
  return {
    from: addCalendarDays(normalized.from, amount),
    to: addCalendarDays(normalized.to, amount),
  }
}

export function clampDateToBounds(
  date: Date,
  minDate?: Date,
  maxDate?: Date,
): Date {
  assertValidBounds(minDate, maxDate)
  const ordinal = toDayOrdinal(date)
  const minimum = minDate ? toDayOrdinal(minDate) : Number.NEGATIVE_INFINITY
  const maximum = maxDate ? toDayOrdinal(maxDate) : Number.POSITIVE_INFINITY
  return fromDayOrdinal(Math.min(maximum, Math.max(minimum, ordinal)))
}

/**
 * Clamp a range to optional bounds while preserving its inclusive duration
 * whenever the bounded domain is large enough to contain it.
 */
export function clampRangeToBounds(
  range: DateRange,
  minDate?: Date,
  maxDate?: Date,
): DateRange {
  assertValidBounds(minDate, maxDate)
  const normalized = normalizeRange(range)
  const duration = inclusiveDayCount(normalized)
  const minimum = minDate
    ? toDayOrdinal(minDate)
    : Number.NEGATIVE_INFINITY
  const maximum = maxDate
    ? toDayOrdinal(maxDate)
    : Number.POSITIVE_INFINITY

  if (
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    maximum - minimum + 1 <= duration
  ) {
    return {
      from: fromDayOrdinal(minimum),
      to: fromDayOrdinal(maximum),
    }
  }

  let from = toDayOrdinal(normalized.from)
  let to = toDayOrdinal(normalized.to)

  if (from < minimum) {
    from = minimum
    to = from + duration - 1
  }
  if (to > maximum) {
    to = maximum
    from = to - duration + 1
  }

  return { from: fromDayOrdinal(from), to: fromDayOrdinal(to) }
}

/** Clamp each endpoint independently. Useful while resizing a selection. */
export function clampRangeEdges(
  range: DateRange,
  minDate?: Date,
  maxDate?: Date,
): DateRange {
  assertValidBounds(minDate, maxDate)
  return normalizeRange({
    from: clampDateToBounds(range.from, minDate, maxDate),
    to: clampDateToBounds(range.to, minDate, maxDate),
  })
}

export function rangeFromStartAndDays(from: Date, days: number): DateRange {
  if (!Number.isFinite(days) || days < 1) {
    throw new RangeError("days must be at least 1")
  }
  const start = startOfCalendarDay(from)
  return { from: start, to: addCalendarDays(start, Math.trunc(days) - 1) }
}
