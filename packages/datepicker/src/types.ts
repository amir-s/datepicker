import type {
  ComponentType,
  CSSProperties,
  ReactNode,
} from "react"
import type { Locale } from "date-fns"
import type { PropsBase, PropsRange } from "react-day-picker"

/** An inclusive range of local calendar days. */
export interface DateRange {
  from: Date
  to: Date
}

export interface DatePreset {
  id: string
  label: ReactNode
  range: DateRange | ((today: Date) => DateRange)
}

export interface ZoomLevel {
  id: string
  /** Largest inclusive selection length handled by this level. */
  maxSelectionDays: number
  /** Inclusive viewport length, in calendar days. */
  viewportDays: number | ((selectionDays: number) => number)
  /** Smallest inclusive selection length allowed at this level. */
  minSelectionDays: number
}

export type ZoomMode = "auto" | "fixed"

export type TimelineDateAlignment = "start" | "center" | "end"

export type TickUnit = "day" | "week" | "month" | "year"

export interface TickInterval {
  unit: TickUnit
  step: number
}

export interface TimelineTick {
  date: Date
  label: string
  position: number
  interval: TickInterval
  align?: TimelineDateAlignment
  isBoundary?: boolean
}

export interface TimelineChartContext {
  value: DateRange
  viewport: DateRange
  width: number
  height: number
  zoomLevel: string
  isInteracting: boolean
  x: (date: Date, align?: TimelineDateAlignment) => number
  dateAt: (x: number) => Date
}

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

type CalendarOwnedProp =
  | "mode"
  | "required"
  | "selected"
  | "onSelect"
  | "today"
  | "startMonth"
  | "endMonth"
  | "numberOfMonths"

/**
 * Props forwarded to React DayPicker. Selection and responsive layout props are
 * owned by TimelineDateRangePicker and therefore intentionally omitted.
 */
export type TimelineCalendarProps = Omit<
  PropsBase & PropsRange,
  CalendarOwnedProp
>

export type TimelineDateRangePickerSlot =
  | "root"
  | "header"
  | "dateTrigger"
  | "dateTriggerIcon"
  | "dateTriggerText"
  | "presetList"
  | "preset"
  | "timeline"
  | "chart"
  | "selection"
  | "selectionLabel"
  | "moveControl"
  | "startHandle"
  | "endHandle"
  | "ticks"
  | "tick"
  | "tickLabel"
  | "panPrevious"
  | "panNext"
  | "calendarContent"
  | "calendar"
  | "liveRegion"

export type TimelineDateRangePickerClassNames = Partial<
  Record<TimelineDateRangePickerSlot, string>
>

export interface TimelineIconProps {
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}

export interface TimelineSelectionLabelProps {
  value: DateRange
  durationDays: number
  isInteracting: boolean
  className?: string
}

export interface TimelineRangeHandleProps {
  edge: "start" | "end"
  date: Date
  className?: string
}

export interface TimelineTickLabelProps {
  tick: TimelineTick
  className?: string
}

export interface TimelineDateRangePickerComponents {
  CalendarIcon?: ComponentType<TimelineIconProps>
  PreviousIcon?: ComponentType<TimelineIconProps>
  NextIcon?: ComponentType<TimelineIconProps>
  SelectionLabel?: ComponentType<TimelineSelectionLabelProps>
  RangeHandle?: ComponentType<TimelineRangeHandleProps>
  TickLabel?: ComponentType<TimelineTickLabelProps>
}

export interface DateFormatContext {
  locale?: Locale
}

export interface TickFormatContext extends DateFormatContext {
  interval: TickInterval
  viewport: DateRange
}

export interface TimelineDateRangePickerProps {
  value?: DateRange
  defaultValue?: DateRange
  onValueChange?: (value: DateRange) => void
  onValueCommit?: (value: DateRange) => void

  viewport?: DateRange
  defaultViewport?: DateRange
  onViewportChange?: (viewport: DateRange) => void

  zoomMode?: ZoomMode
  zoomLevels?: readonly ZoomLevel[]
  presets?: readonly DatePreset[]
  today?: Date
  minDate?: Date
  maxDate?: Date

  renderChart?: (context: TimelineChartContext) => ReactNode
  chartPointerEvents?: boolean
  showPanControls?: boolean
  chartHeight?: number

  locale?: Locale
  weekStartsOn?: WeekStartsOn
  calendarProps?: TimelineCalendarProps
  formatDateRange?: (range: DateRange, context: DateFormatContext) => ReactNode
  formatTick?: (date: Date, context: TickFormatContext) => string
  formatDuration?: (days: number, range: DateRange) => ReactNode

  className?: string
  classNames?: TimelineDateRangePickerClassNames
  components?: TimelineDateRangePickerComponents
  style?: CSSProperties
  id?: string
  ariaLabel?: string
  disabled?: boolean
}
