"use client"

import { format } from "date-fns"
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import * as React from "react"
import type { DateRange as DayPickerDateRange } from "react-day-picker"

import { CalendarPicker } from "./calendar-picker"
import {
  clampRangeToBounds,
  fromDayOrdinal,
  inclusiveDayCount,
  normalizeRange,
  rangesEqual,
  shiftRange,
  startOfCalendarDay,
  toDayOrdinal,
} from "./date-math"
import {
  dateToX,
  selectResponsiveTicks,
  xToDate,
} from "./ticks"
import type {
  DatePreset,
  DateRange,
  TimelineDateRangePickerProps,
  TimelineRangeHandleProps,
  TimelineSelectionLabelProps,
  TimelineTickLabelProps,
  ZoomLevel,
} from "./types"
import { cn } from "./utils"
import {
  DEFAULT_ZOOM_LEVELS,
  fitViewportToSelection,
  panViewportToReveal,
  resolveViewportDays,
  selectZoomLevel,
} from "./zoom"

type InteractionMode = "move" | "start" | "end"

interface ActiveInteraction {
  mode: InteractionMode
  pointerId: number
  originX: number
  initial: DateRange
  last: DateRange
}

function DefaultSelectionLabel({ durationDays }: TimelineSelectionLabelProps) {
  return <>{durationDays} {durationDays === 1 ? "Day" : "Days"}</>
}

function DefaultRangeHandle({ edge }: TimelineRangeHandleProps) {
  return <span className="tdp-sr-only">Resize {edge} date</span>
}

function DefaultTickLabel({ tick }: TimelineTickLabelProps) {
  return <>{tick.label}</>
}

function levelForViewport(
  viewport: DateRange,
  levels: readonly ZoomLevel[],
) {
  const viewportDays = inclusiveDayCount(viewport)
  const candidates = [...levels]
    .sort((left, right) => left.maxSelectionDays - right.maxSelectionDays)
    .map(level => ({
      level,
      viewportDays: Number.isFinite(level.maxSelectionDays)
        ? resolveViewportDays(level, level.maxSelectionDays)
        : typeof level.viewportDays === "number"
          ? Math.ceil(level.viewportDays)
          : Number.POSITIVE_INFINITY,
    }))

  return candidates.find(candidate => candidate.viewportDays >= viewportDays)?.level
    ?? candidates.at(-1)?.level
    ?? DEFAULT_ZOOM_LEVELS[0]!
}

function defaultRangeLabel(range: DateRange, locale?: TimelineDateRangePickerProps["locale"]) {
  const includeYear = range.from.getFullYear() !== range.to.getFullYear()
  const options = locale ? { locale } : undefined
  return (
    <>
      <span>{format(range.from, includeYear ? "dd MMM yyyy" : "dd MMM", options)}</span>
      <span className="tdp-range-separator" aria-hidden="true">—</span>
      <span>{format(range.to, includeYear ? "dd MMM yyyy" : "dd MMM", options)}</span>
    </>
  )
}

function formatAriaRange(range: DateRange, locale?: TimelineDateRangePickerProps["locale"]) {
  const options = locale ? { locale } : undefined
  return `${format(range.from, "PPPP", options)} through ${format(range.to, "PPPP", options)}`
}

function resolvePreset(preset: DatePreset, today: Date, minDate?: Date, maxDate?: Date) {
  const value = typeof preset.range === "function" ? preset.range(today) : preset.range
  return clampRangeToBounds(normalizeRange(value), minDate, maxDate)
}

function clampMoveToViewport(range: DateRange, viewport: DateRange, minDate?: Date, maxDate?: Date) {
  const duration = inclusiveDayCount(range)
  const minimum = Math.max(
    toDayOrdinal(viewport.from),
    minDate ? toDayOrdinal(minDate) : Number.NEGATIVE_INFINITY,
  )
  const maximum = Math.min(
    toDayOrdinal(viewport.to),
    maxDate ? toDayOrdinal(maxDate) : Number.POSITIVE_INFINITY,
  )
  let from = toDayOrdinal(range.from)
  let to = toDayOrdinal(range.to)

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

function createInteractionRange(
  interaction: ActiveInteraction,
  deltaDays: number,
  viewport: DateRange,
  minimumDays: number,
  minDate?: Date,
  maxDate?: Date,
) {
  const initialFrom = toDayOrdinal(interaction.initial.from)
  const initialTo = toDayOrdinal(interaction.initial.to)
  const lower = Math.max(
    toDayOrdinal(viewport.from),
    minDate ? toDayOrdinal(minDate) : Number.NEGATIVE_INFINITY,
  )
  const upper = Math.min(
    toDayOrdinal(viewport.to),
    maxDate ? toDayOrdinal(maxDate) : Number.POSITIVE_INFINITY,
  )

  if (interaction.mode === "move") {
    return clampMoveToViewport(
      {
        from: fromDayOrdinal(initialFrom + deltaDays),
        to: fromDayOrdinal(initialTo + deltaDays),
      },
      viewport,
      minDate,
      maxDate,
    )
  }

  if (interaction.mode === "start") {
    const nextFrom = Math.min(
      initialTo - minimumDays + 1,
      Math.max(lower, initialFrom + deltaDays),
    )
    return { from: fromDayOrdinal(nextFrom), to: fromDayOrdinal(initialTo) }
  }

  const nextTo = Math.max(
    initialFrom + minimumDays - 1,
    Math.min(upper, initialTo + deltaDays),
  )
  return { from: fromDayOrdinal(initialFrom), to: fromDayOrdinal(nextTo) }
}

export function TimelineDateRangePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommit,
  viewport: viewportProp,
  defaultViewport,
  onViewportChange,
  zoomMode = "auto",
  zoomLevels = DEFAULT_ZOOM_LEVELS,
  presets = [],
  today: todayProp,
  minDate: minDateProp,
  maxDate: maxDateProp,
  renderChart,
  chartPointerEvents = false,
  showPanControls = false,
  chartHeight,
  locale,
  weekStartsOn = 0,
  calendarProps,
  formatDateRange,
  formatTick,
  formatDuration,
  className,
  classNames,
  components,
  style,
  id,
  ariaLabel = "Date range",
  disabled = false,
}: TimelineDateRangePickerProps) {
  const today = React.useMemo(
    () => startOfCalendarDay(todayProp ?? new Date()),
    [todayProp],
  )
  const minDate = React.useMemo(
    () => minDateProp ? startOfCalendarDay(minDateProp) : undefined,
    [minDateProp],
  )
  const maxDate = React.useMemo(
    () => maxDateProp ? startOfCalendarDay(maxDateProp) : undefined,
    [maxDateProp],
  )

  const [uncontrolledValue, setUncontrolledValue] = React.useState<DateRange>(() =>
    clampRangeToBounds(
      normalizeRange(defaultValue ?? valueProp ?? { from: today, to: today }),
      minDate,
      maxDate,
    ),
  )
  const normalizedPropValue = React.useMemo(
    () => valueProp
      ? clampRangeToBounds(normalizeRange(valueProp), minDate, maxDate)
      : undefined,
    [maxDate, minDate, valueProp],
  )
  const valueControlled = normalizedPropValue !== undefined

  const [uncontrolledViewport, setUncontrolledViewport] = React.useState<DateRange>(() => {
    const initialValue = normalizedPropValue ?? uncontrolledValue
    const level = selectZoomLevel(inclusiveDayCount(initialValue), zoomLevels)
    return defaultViewport
      ? clampRangeToBounds(normalizeRange(defaultViewport), minDate, maxDate)
      : fitViewportToSelection(initialValue, level, { minDate, maxDate })
  })
  const normalizedPropViewport = React.useMemo(
    () => viewportProp
      ? clampRangeToBounds(normalizeRange(viewportProp), minDate, maxDate)
      : undefined,
    [maxDate, minDate, viewportProp],
  )
  const viewportControlled = normalizedPropViewport !== undefined
  const viewport = normalizedPropViewport ?? uncontrolledViewport

  const [interactionMode, setInteractionMode] = React.useState<InteractionMode | null>(null)
  const [interactionDraft, setInteractionDraft] = React.useState<DateRange>()
  const interactionRef = React.useRef<ActiveInteraction | undefined>(undefined)
  const baseValue = normalizedPropValue ?? uncontrolledValue
  const value = interactionDraft ?? baseValue

  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [calendarDraft, setCalendarDraft] = React.useState<DayPickerDateRange>()
  const [liveMessage, setLiveMessage] = React.useState("")
  const trackRef = React.useRef<HTMLDivElement>(null)
  const tickMeasureRef = React.useRef<HTMLSpanElement>(null)
  const [trackSize, setTrackSize] = React.useState({ width: 0, height: 0 })
  const [ticks, setTicks] = React.useState<ReturnType<typeof selectResponsiveTicks>>([])

  React.useLayoutEffect(() => {
    const element = trackRef.current
    if (!element) return
    const update = () => setTrackSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const activeLevel = React.useMemo(
    () => levelForViewport(viewport, zoomLevels),
    [viewport, zoomLevels],
  )
  const minimumSelectionDays = activeLevel.minSelectionDays
  const viewportDays = inclusiveDayCount(viewport)

  const updateViewport = React.useCallback((nextViewport: DateRange) => {
    const normalized = clampRangeToBounds(normalizeRange(nextViewport), minDate, maxDate)
    if (rangesEqual(normalized, viewport)) return
    if (!viewportControlled) setUncontrolledViewport(normalized)
    onViewportChange?.(normalized)
  }, [maxDate, minDate, onViewportChange, viewport, viewportControlled])

  const viewportForSelection = React.useCallback((nextValue: DateRange) => {
    if (zoomMode === "fixed") {
      return panViewportToReveal(viewport, nextValue, { minDate, maxDate })
    }
    const level = selectZoomLevel(inclusiveDayCount(nextValue), zoomLevels)
    return fitViewportToSelection(nextValue, level, { minDate, maxDate })
  }, [maxDate, minDate, viewport, zoomLevels, zoomMode])

  const setValue = React.useCallback((nextValue: DateRange, notify = true) => {
    const normalized = clampRangeToBounds(normalizeRange(nextValue), minDate, maxDate)
    if (!valueControlled) setUncontrolledValue(normalized)
    if (notify) onValueChange?.(normalized)
    return normalized
  }, [maxDate, minDate, onValueChange, valueControlled])

  const commitValue = React.useCallback((nextValue: DateRange, notifyChange = true) => {
    const normalized = clampRangeToBounds(normalizeRange(nextValue), minDate, maxDate)
    const duration = inclusiveDayCount(normalized)
    const targetMinimum = zoomMode === "fixed"
      ? minimumSelectionDays
      : selectZoomLevel(duration, zoomLevels).minSelectionDays
    if (
      duration < targetMinimum ||
      (zoomMode === "fixed" && duration > inclusiveDayCount(viewport))
    ) {
      return false
    }
    const committed = setValue(normalized, notifyChange)
    onValueCommit?.(committed)
    updateViewport(viewportForSelection(committed))
    setLiveMessage(`Selected ${formatAriaRange(committed, locale)}, ${inclusiveDayCount(committed)} days`)
    return true
  }, [locale, maxDate, minDate, minimumSelectionDays, onValueCommit, setValue, updateViewport, viewport, viewportForSelection, zoomLevels, zoomMode])

  const controlledValueKey = normalizedPropValue
    ? `${toDayOrdinal(normalizedPropValue.from)}:${toDayOrdinal(normalizedPropValue.to)}`
    : undefined
  const previousControlledValueKey = React.useRef(controlledValueKey)
  React.useEffect(() => {
    if (!normalizedPropValue || interactionRef.current) return
    if (previousControlledValueKey.current === controlledValueKey) return
    previousControlledValueKey.current = controlledValueKey
    updateViewport(viewportForSelection(normalizedPropValue))
  }, [controlledValueKey, normalizedPropValue, updateViewport, viewportForSelection])

  const handlePointerDown = React.useCallback((mode: InteractionMode) => (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (disabled || trackSize.width <= 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const initial = normalizeRange(value)
    interactionRef.current = {
      mode,
      pointerId: event.pointerId,
      originX: event.clientX,
      initial,
      last: initial,
    }
    setInteractionMode(mode)
    setInteractionDraft(initial)
  }, [disabled, trackSize.width, value])

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId || trackSize.width <= 0) return
    const deltaDays = Math.round(((event.clientX - interaction.originX) / trackSize.width) * viewportDays)
    const nextValue = createInteractionRange(
      interaction,
      deltaDays,
      viewport,
      minimumSelectionDays,
      minDate,
      maxDate,
    )
    if (rangesEqual(nextValue, interaction.last)) return
    interaction.last = nextValue
    setInteractionDraft(nextValue)
    setValue(nextValue)
  }, [maxDate, minDate, minimumSelectionDays, setValue, trackSize.width, viewport, viewportDays])

  const finishPointerInteraction = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    interactionRef.current = undefined
    setInteractionMode(null)
    setInteractionDraft(undefined)
    commitValue(interaction.last, false)
  }, [commitValue])

  const cancelPointerInteraction = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    interactionRef.current = undefined
    setInteractionMode(null)
    setInteractionDraft(undefined)
    setValue(interaction.initial)
  }, [setValue])

  const keyboardRange = React.useCallback((mode: InteractionMode, key: string, shiftKey: boolean) => {
    const amount = shiftKey ? 7 : 1
    const direction = key === "ArrowLeft" || key === "ArrowDown" ? -amount : amount
    const from = toDayOrdinal(value.from)
    const to = toDayOrdinal(value.to)
    const lower = Math.max(
      toDayOrdinal(viewport.from),
      minDate ? toDayOrdinal(minDate) : Number.NEGATIVE_INFINITY,
    )
    const upper = Math.min(
      toDayOrdinal(viewport.to),
      maxDate ? toDayOrdinal(maxDate) : Number.POSITIVE_INFINITY,
    )

    if (key === "Home" || key === "End") {
      if (mode === "move") {
        const duration = inclusiveDayCount(value)
        const next = key === "Home"
          ? { from: fromDayOrdinal(lower), to: fromDayOrdinal(lower + duration - 1) }
          : { from: fromDayOrdinal(upper - duration + 1), to: fromDayOrdinal(upper) }
        return clampMoveToViewport(next, viewport, minDate, maxDate)
      }
      if (mode === "start") {
        return {
          from: fromDayOrdinal(key === "Home" ? lower : to - minimumSelectionDays + 1),
          to: value.to,
        }
      }
      return {
        from: value.from,
        to: fromDayOrdinal(key === "End" ? upper : from + minimumSelectionDays - 1),
      }
    }

    const synthetic: ActiveInteraction = {
      mode,
      pointerId: -1,
      originX: 0,
      initial: value,
      last: value,
    }
    return createInteractionRange(synthetic, direction, viewport, minimumSelectionDays, minDate, maxDate)
  }, [maxDate, minDate, minimumSelectionDays, value, viewport])

  const handleKeyDown = React.useCallback((mode: InteractionMode) => (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const next = keyboardRange(mode, event.key, event.shiftKey)
    commitValue(next)
  }, [commitValue, disabled, keyboardRange])

  const resolvedPresets = React.useMemo(
    () => presets.map(preset => ({ preset, value: resolvePreset(preset, today, minDate, maxDate) })),
    [maxDate, minDate, presets, today],
  )

  const handleCalendarOpenChange = React.useCallback((open: boolean) => {
    setCalendarOpen(open)
    setCalendarDraft(undefined)
  }, [])

  const handleCalendarSelect = React.useCallback((
    next: DayPickerDateRange | undefined,
    triggerDate: Date,
  ) => {
    if (!calendarDraft) {
      setCalendarDraft({ from: startOfCalendarDay(triggerDate), to: undefined })
      return
    }

    setCalendarDraft(next)
    if (!next?.from || !next.to) return
    const candidate = clampRangeToBounds(normalizeRange({ from: next.from, to: next.to }), minDate, maxDate)
    if (!commitValue(candidate)) return
    setCalendarOpen(false)
    setCalendarDraft(undefined)
  }, [calendarDraft, commitValue, maxDate, minDate])

  const panBy = React.useCallback((direction: -1 | 1) => {
    const amount = Math.max(1, Math.round(viewportDays / 2)) * direction
    updateViewport(clampRangeToBounds(shiftRange(viewport, amount), minDate, maxDate))
  }, [maxDate, minDate, updateViewport, viewport, viewportDays])

  React.useLayoutEffect(() => {
    const measureElement = tickMeasureRef.current
    const measureText = measureElement
      ? (label: string) => {
          measureElement.textContent = label
          return measureElement.getBoundingClientRect().width
        }
      : undefined

    setTicks(selectResponsiveTicks(viewport, trackSize.width, {
      locale,
      weekStartsOn,
      minGap: 12,
      formatTick,
      measureText,
    }))
  }, [formatTick, locale, trackSize.width, viewport, weekStartsOn])

  const selectionStart = Math.max(0, dateToX(value.from, viewport, 100, "start"))
  const selectionEnd = Math.min(100, dateToX(value.to, viewport, 100, "end"))
  const selectionWidth = Math.max(0, selectionEnd - selectionStart)

  const chartContext = React.useMemo(() => ({
    value,
    viewport,
    width: trackSize.width,
    height: chartHeight ?? Math.max(0, trackSize.height - 48),
    zoomLevel: activeLevel.id,
    isInteracting: interactionMode !== null,
    x: (date: Date, align: "start" | "center" | "end" = "center") =>
      dateToX(date, viewport, trackSize.width, align),
    dateAt: (x: number) => xToDate(x, viewport, trackSize.width),
  }), [activeLevel.id, chartHeight, interactionMode, trackSize.height, trackSize.width, value, viewport])

  const CalendarIcon = components?.CalendarIcon ?? CalendarDaysIcon
  const PreviousIcon = components?.PreviousIcon ?? ChevronLeftIcon
  const NextIcon = components?.NextIcon ?? ChevronRightIcon
  const SelectionLabel = components?.SelectionLabel ?? DefaultSelectionLabel
  const RangeHandle = components?.RangeHandle ?? DefaultRangeHandle
  const TickLabel = components?.TickLabel ?? DefaultTickLabel
  const durationDays = inclusiveDayCount(value)
  const durationContent = formatDuration?.(durationDays, value)
  const rangeContent = formatDateRange?.(value, { locale }) ?? defaultRangeLabel(value, locale)
  const fixedMaximumDays = zoomMode === "fixed" ? viewportDays : undefined

  return (
    <div
      id={id}
      className={cn("tdp-root", classNames?.root, className)}
      data-slot="root"
      data-state={disabled ? "disabled" : "ready"}
      data-dragging={interactionMode ? "true" : "false"}
      data-zoom-mode={zoomMode}
      data-zoom-level={activeLevel.id}
      style={style}
    >
      <div className={cn("tdp-header", classNames?.header)} data-slot="header">
        <CalendarPicker
          trigger={
            <button
              type="button"
              className={cn("tdp-date-trigger", classNames?.dateTrigger)}
              data-slot="date-trigger"
              aria-label={`Choose date range. Current selection: ${formatAriaRange(value, locale)}`}
              disabled={disabled}
            >
              <CalendarIcon className={classNames?.dateTriggerIcon} aria-hidden="true" />
              <span className={cn("tdp-range-label", classNames?.dateTriggerText)} data-slot="date-trigger-text">
                {rangeContent}
              </span>
            </button>
          }
          open={calendarOpen}
          onOpenChange={handleCalendarOpenChange}
          selected={value}
          draft={calendarDraft}
          onSelect={handleCalendarSelect}
          today={today}
          minDate={minDate}
          maxDate={maxDate}
          minDays={zoomMode === "fixed" ? minimumSelectionDays : undefined}
          maxDays={fixedMaximumDays}
          className={classNames?.calendarContent}
          calendarClassName={classNames?.calendar}
          calendarProps={{
            ...calendarProps,
            locale: locale ?? calendarProps?.locale,
            weekStartsOn,
          }}
        />

        {resolvedPresets.length > 0 && (
          <div
            className={cn("tdp-presets", classNames?.presetList)}
            data-slot="preset-list"
            role="group"
            aria-label="Date range presets"
          >
            {resolvedPresets.map(({ preset, value: presetValue }) => {
              const active = rangesEqual(value, presetValue)
              const presetDays = inclusiveDayCount(presetValue)
              const presetMinimum = zoomMode === "fixed"
                ? minimumSelectionDays
                : selectZoomLevel(presetDays, zoomLevels).minSelectionDays
              const unavailable = presetDays < presetMinimum
                || (zoomMode === "fixed" && presetDays > viewportDays)
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={cn("tdp-preset", classNames?.preset)}
                  data-slot="preset"
                  data-active={active ? "true" : "false"}
                  aria-pressed={active}
                  disabled={disabled || unavailable}
                  onClick={() => commitValue(presetValue)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        className={cn("tdp-timeline-shell", classNames?.timeline)}
        data-slot="timeline"
        data-pan-controls={showPanControls ? "true" : "false"}
        role="group"
        aria-label={ariaLabel}
      >
        {showPanControls && (
          <button
            type="button"
            className={cn("tdp-pan-button", classNames?.panPrevious)}
            data-slot="pan-previous"
            aria-label="Show earlier dates"
            disabled={disabled}
            onClick={() => panBy(-1)}
          >
            <PreviousIcon aria-hidden="true" />
          </button>
        )}

        <div ref={trackRef} className="tdp-track" data-testid="datepicker-track">
          <span
            ref={tickMeasureRef}
            className={cn("tdp-tick", "tdp-tick-measurer", classNames?.tick, classNames?.tickLabel)}
            aria-hidden="true"
          />

          {renderChart && (
            <div
              className={cn("tdp-chart", classNames?.chart)}
              data-slot="chart"
              aria-hidden={chartPointerEvents ? undefined : true}
              style={{ pointerEvents: chartPointerEvents ? "auto" : "none" }}
            >
              {renderChart(chartContext)}
            </div>
          )}

          <div
            className={cn("tdp-selection", classNames?.selection)}
            data-slot="selection"
            data-dragging={interactionMode ? "true" : "false"}
            style={{
              "--tdp-selection-start": `${selectionStart}%`,
              "--tdp-selection-width": `${selectionWidth}%`,
            } as React.CSSProperties}
          >
            <button
              type="button"
              className={cn("tdp-selection-body", classNames?.moveControl)}
              data-slot="move-control"
              data-active={interactionMode === "move" ? "true" : "false"}
              aria-label={`Move selected range, ${formatAriaRange(value, locale)}`}
              disabled={disabled}
              onPointerDown={handlePointerDown("move")}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerInteraction}
              onPointerCancel={cancelPointerInteraction}
              onKeyDown={handleKeyDown("move")}
            />

            <button
              type="button"
              role="slider"
              className={cn("tdp-handle", "tdp-handle-start", classNames?.startHandle)}
              data-slot="start-handle"
              data-active={interactionMode === "start" ? "true" : "false"}
              aria-label="Start date"
              aria-valuemin={toDayOrdinal(viewport.from)}
              aria-valuemax={toDayOrdinal(value.to) - minimumSelectionDays + 1}
              aria-valuenow={toDayOrdinal(value.from)}
              aria-valuetext={format(value.from, "PPPP", locale ? { locale } : undefined)}
              disabled={disabled}
              onPointerDown={handlePointerDown("start")}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerInteraction}
              onPointerCancel={cancelPointerInteraction}
              onKeyDown={handleKeyDown("start")}
            >
              <RangeHandle edge="start" date={value.from} className={classNames?.startHandle} />
            </button>

            <span
              className={cn("tdp-duration-label", classNames?.selectionLabel)}
              data-slot="selection-label"
            >
              {durationContent ?? (
                <SelectionLabel
                  value={value}
                  durationDays={durationDays}
                  isInteracting={interactionMode !== null}
                  className={classNames?.selectionLabel}
                />
              )}
            </span>

            <button
              type="button"
              role="slider"
              className={cn("tdp-handle", "tdp-handle-end", classNames?.endHandle)}
              data-slot="end-handle"
              data-active={interactionMode === "end" ? "true" : "false"}
              aria-label="End date"
              aria-valuemin={toDayOrdinal(value.from) + minimumSelectionDays - 1}
              aria-valuemax={toDayOrdinal(viewport.to)}
              aria-valuenow={toDayOrdinal(value.to)}
              aria-valuetext={format(value.to, "PPPP", locale ? { locale } : undefined)}
              disabled={disabled}
              onPointerDown={handlePointerDown("end")}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerInteraction}
              onPointerCancel={cancelPointerInteraction}
              onKeyDown={handleKeyDown("end")}
            >
              <RangeHandle edge="end" date={value.to} className={classNames?.endHandle} />
            </button>
          </div>

          <div className={cn("tdp-ticks", classNames?.ticks)} data-slot="ticks" aria-hidden="true">
            {ticks.map((tick, index) => {
              const edge = index === 0 ? "start" : index === ticks.length - 1 ? "end" : undefined
              return (
                <span
                  key={`${toDayOrdinal(tick.date)}-${tick.interval.unit}-${tick.interval.step}`}
                  className={cn("tdp-tick", classNames?.tick)}
                  data-slot="tick"
                  data-edge={edge}
                  style={{ left: `${tick.position}px` }}
                >
                  <span className={classNames?.tickLabel} data-slot="tick-label">
                    <TickLabel tick={tick} className={classNames?.tickLabel} />
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        {showPanControls && (
          <button
            type="button"
            className={cn("tdp-pan-button", classNames?.panNext)}
            data-slot="pan-next"
            aria-label="Show later dates"
            disabled={disabled}
            onClick={() => panBy(1)}
          >
            <NextIcon aria-hidden="true" />
          </button>
        )}
      </div>

      <span className={cn("tdp-live-region", classNames?.liveRegion)} data-slot="live-region" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  )
}
