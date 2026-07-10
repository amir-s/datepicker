import {
  addCalendarDays,
  clampRangeToBounds,
  inclusiveDayCount,
  normalizeRange,
  toDayOrdinal,
} from "./date-math"
import type { DateRange, ZoomLevel, ZoomMode } from "./types"

const roundedMultiYearViewport = (selectionDays: number): number =>
  Math.ceil((selectionDays * 1.15) / 30) * 30

/** Default levels are ordered from the densest to the broadest viewport. */
export const DEFAULT_ZOOM_LEVELS: readonly ZoomLevel[] = Object.freeze([
  {
    id: "two-weeks",
    maxSelectionDays: 7,
    viewportDays: 14,
    minSelectionDays: 1,
  },
  {
    id: "six-weeks",
    maxSelectionDays: 31,
    viewportDays: 45,
    minSelectionDays: 1,
  },
  {
    id: "four-months",
    maxSelectionDays: 92,
    viewportDays: 120,
    minSelectionDays: 2,
  },
  {
    id: "thirteen-months",
    maxSelectionDays: 366,
    viewportDays: 400,
    minSelectionDays: 7,
  },
  {
    id: "multi-year",
    maxSelectionDays: Number.POSITIVE_INFINITY,
    viewportDays: roundedMultiYearViewport,
    minSelectionDays: 30,
  },
])

export interface ViewportBounds {
  minDate?: Date
  maxDate?: Date
}

export interface ResolveViewportOptions extends ViewportBounds {
  zoomMode?: ZoomMode
  zoomLevels?: readonly ZoomLevel[]
  currentViewport?: DateRange
}

export interface ResolvedViewport {
  viewport: DateRange
  zoomLevel: ZoomLevel
  viewportDays: number
}

function validateZoomLevel(level: ZoomLevel): void {
  if (
    !level.id ||
    !(level.maxSelectionDays > 0) ||
    !(level.minSelectionDays >= 1)
  ) {
    throw new RangeError(`Invalid zoom level: ${level.id || "(missing id)"}`)
  }
}

/** Choose the level with the smallest upper bound that fits the selection. */
export function selectZoomLevel(
  selectionDays: number,
  levels: readonly ZoomLevel[] = DEFAULT_ZOOM_LEVELS,
): ZoomLevel {
  if (!Number.isFinite(selectionDays) || selectionDays < 1) {
    throw new RangeError("selectionDays must be at least 1")
  }
  if (levels.length === 0) {
    throw new RangeError("zoomLevels must contain at least one level")
  }

  let fitting: ZoomLevel | undefined
  let broadest: ZoomLevel | undefined
  for (const level of levels) {
    validateZoomLevel(level)
    if (!broadest || level.maxSelectionDays > broadest.maxSelectionDays) {
      broadest = level
    }
    if (
      selectionDays <= level.maxSelectionDays &&
      (!fitting || level.maxSelectionDays < fitting.maxSelectionDays)
    ) {
      fitting = level
    }
  }

  return fitting ?? broadest!
}

export function resolveViewportDays(
  level: ZoomLevel,
  selectionDays: number,
): number {
  validateZoomLevel(level)
  const configured =
    typeof level.viewportDays === "function"
      ? level.viewportDays(selectionDays)
      : level.viewportDays
  if (!Number.isFinite(configured) || configured < 1) {
    throw new RangeError(`Zoom level ${level.id} returned an invalid viewport`)
  }
  return Math.max(selectionDays, Math.ceil(configured))
}

/**
 * Center a viewport around a selection and shift it as a whole when it reaches
 * a domain bound. The inclusive viewport length is preserved whenever the
 * bounded domain can contain it.
 */
export function fitViewportToSelection(
  selection: DateRange,
  level: ZoomLevel,
  bounds: ViewportBounds = {},
): DateRange {
  const boundedSelection = clampRangeToBounds(
    normalizeRange(selection),
    bounds.minDate,
    bounds.maxDate,
  )
  const selectionDays = inclusiveDayCount(boundedSelection)
  const viewportDays = resolveViewportDays(level, selectionDays)
  const spareDays = viewportDays - selectionDays
  const daysBefore = Math.floor(spareDays / 2)
  const from = addCalendarDays(boundedSelection.from, -daysBefore)
  const viewport = {
    from,
    to: addCalendarDays(from, viewportDays - 1),
  }

  return clampRangeToBounds(viewport, bounds.minDate, bounds.maxDate)
}

export function selectionFitsViewport(
  viewport: DateRange,
  selection: DateRange,
): boolean {
  return inclusiveDayCount(selection) <= inclusiveDayCount(viewport)
}

/**
 * Keep a fixed viewport span and pan only as far as needed to reveal the full
 * selection. Oversized selections are rejected by returning the viewport
 * unchanged; callers can use {@link selectionFitsViewport} to disable them.
 */
export function panViewportToReveal(
  viewport: DateRange,
  selection: DateRange,
  bounds: ViewportBounds = {},
): DateRange {
  const normalizedViewport = normalizeRange(viewport)
  const normalizedSelection = normalizeRange(selection)
  const viewportDays = inclusiveDayCount(normalizedViewport)

  if (!selectionFitsViewport(normalizedViewport, normalizedSelection)) {
    return normalizedViewport
  }

  let next = normalizedViewport
  if (
    toDayOrdinal(normalizedSelection.from) <
    toDayOrdinal(normalizedViewport.from)
  ) {
    next = {
      from: normalizedSelection.from,
      to: addCalendarDays(normalizedSelection.from, viewportDays - 1),
    }
  } else if (
    toDayOrdinal(normalizedSelection.to) > toDayOrdinal(normalizedViewport.to)
  ) {
    next = {
      from: addCalendarDays(normalizedSelection.to, -(viewportDays - 1)),
      to: normalizedSelection.to,
    }
  }

  return clampRangeToBounds(next, bounds.minDate, bounds.maxDate)
}

/** Resolve the viewport and active level for either adaptive or fixed mode. */
export function resolveViewportForSelection(
  selection: DateRange,
  options: ResolveViewportOptions = {},
): ResolvedViewport {
  const levels = options.zoomLevels ?? DEFAULT_ZOOM_LEVELS
  const selectionDays = inclusiveDayCount(selection)
  const zoomLevel = selectZoomLevel(selectionDays, levels)
  const zoomMode = options.zoomMode ?? "auto"

  const viewport =
    zoomMode === "fixed" && options.currentViewport
      ? panViewportToReveal(options.currentViewport, selection, options)
      : fitViewportToSelection(selection, zoomLevel, options)

  return {
    viewport,
    zoomLevel,
    viewportDays: inclusiveDayCount(viewport),
  }
}

/** Resolve the minimum duration for a selection at its current auto level. */
export function minimumSelectionDays(
  selectionDays: number,
  levels: readonly ZoomLevel[] = DEFAULT_ZOOM_LEVELS,
): number {
  return selectZoomLevel(selectionDays, levels).minSelectionDays
}
