# @amir-s/datepicker

A shadcn-compatible React timeline date range picker with presets, responsive
ticks, adaptive zoom, chart composition, and an accessible calendar fallback.

## Installation

```bash
npm install @amir-s/datepicker
```

React and React DOM are peer dependencies. React 18.2+ and React 19 are
supported.

```tsx
import {
  TimelineDateRangePicker,
  type DatePreset,
} from "@amir-s/datepicker"
import "@amir-s/datepicker/styles.css"

const presets: DatePreset[] = [
  {
    id: "last-30-days",
    label: "Last 30 days",
    range: today => ({
      from: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 29,
      ),
      to: today,
    }),
  },
]

export function DateRangeField() {
  return (
    <TimelineDateRangePicker
      ariaLabel="Report date range"
      defaultValue={{
        from: new Date(2026, 6, 1),
        to: new Date(2026, 6, 10),
      }}
      presets={presets}
    />
  )
}
```

Dates use the native zero-based month index. Both endpoints are inclusive and
are normalized to local calendar-day starts.

## Controlled selection and viewport

Selection and viewport state can be controlled separately. `onValueChange`
runs during an interaction; `onValueCommit` runs when a drag, resize, keyboard,
preset, or calendar interaction is committed.

```tsx
import * as React from "react"
import {
  TimelineDateRangePicker,
  type DateRange,
} from "@amir-s/datepicker"
import "@amir-s/datepicker/styles.css"

export function ControlledRange() {
  const [value, setValue] = React.useState<DateRange>({
    from: new Date(2026, 6, 1),
    to: new Date(2026, 6, 10),
  })
  const [viewport, setViewport] = React.useState<DateRange>({
    from: new Date(2026, 5, 15),
    to: new Date(2026, 6, 29),
  })

  return (
    <TimelineDateRangePicker
      ariaLabel="Report date range"
      value={value}
      onValueChange={setValue}
      onValueCommit={range => console.log("Committed range", range)}
      viewport={viewport}
      onViewportChange={setViewport}
      zoomMode="fixed"
      showPanControls
    />
  )
}
```

In `auto` mode, the component selects the smallest configured zoom level that
fits the committed selection and centers it. Resizing keeps the current
viewport stable until commit. In `fixed` mode, viewport duration is preserved;
out-of-view selections pan into view and selections longer than the viewport
are prevented.

The built-in adaptive levels are:

| Selected range | Viewport | Minimum selection |
| --- | ---: | ---: |
| Up to 7 days | 14 days | 1 day |
| Up to 31 days | 45 days | 1 day |
| Up to 92 days | 120 days | 2 days |
| Up to 366 days | 400 days | 7 days |
| More than 366 days | Selection + 15%, rounded to months | 30 days |

Supply `zoomLevels` to replace those thresholds:

```tsx
<TimelineDateRangePicker
  defaultValue={range}
  zoomLevels={[
    {
      id: "fortnight",
      maxSelectionDays: 14,
      viewportDays: 21,
      minSelectionDays: 1,
    },
    {
      id: "quarter",
      maxSelectionDays: 92,
      viewportDays: 120,
      minSelectionDays: 7,
    },
  ]}
/>
```

## Render a chart

`renderChart` is rendered behind the selection. Its helpers use the measured
timeline width and the active viewport, so a chart can share the picker's
coordinate system without reading DOM state.

```tsx
<TimelineDateRangePicker
  defaultValue={range}
  chartHeight={128}
  renderChart={({ width, height, viewport, x, isInteracting }) => {
    const points = series.filter(
      point => point.date >= viewport.from && point.date <= viewport.to,
    )
    const max = Math.max(...points.map(point => point.value), 1)
    const path = points
      .map((point, index) => {
        const y = height - (point.value / max) * height
        return `${index === 0 ? "M" : "L"}${x(point.date)},${y}`
      })
      .join(" ")

    return (
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        opacity={isInteracting ? 0.7 : 1}
      >
        <path d={path} fill="none" stroke="currentColor" />
      </svg>
    )
  }}
/>
```

Chart pointer events are disabled by default so the range remains draggable.
Set `chartPointerEvents` when the rendered chart needs hover or click handling;
the selector and handles remain above the chart.

The render context contains:

```ts
type TimelineChartContext = {
  value: DateRange
  viewport: DateRange
  width: number
  height: number
  zoomLevel: string
  isInteracting: boolean
  x: (date: Date, align?: "start" | "center" | "end") => number
  dateAt: (x: number) => Date
}
```

## Styling and shadcn compatibility

Import `@amir-s/datepicker/styles.css` once. All selectors are scoped to the
component and consume shadcn semantic variables such as `--card`,
`--card-foreground`, `--popover`, `--primary`, `--border`, `--muted`, and
`--ring`, with fallback values for apps that do not define them.

Use `className` and `style` on the root, or target individual parts with
`classNames`:

```tsx
<TimelineDateRangePicker
  defaultValue={range}
  className="my-range-picker"
  classNames={{
    timeline: "min-h-40",
    selection: "shadow-lg",
    tickLabel: "font-mono",
  }}
/>
```

Stable `data-slot` attributes are available for every visual part:
`root`, `header`, `date-trigger`, `preset-list`, `preset`, `timeline`, `chart`,
`selection`, `selection-label`, `move-control`, `start-handle`, `end-handle`,
`ticks`, `tick`, `pan-previous`, `pan-next`, `calendar-content`, `calendar`, and
`live-region`. State is exposed through `data-state`, `data-dragging`, and
`data-zoom-level` where applicable.

For deeper visual changes, `components` can replace the calendar, previous,
and next icons, selection label, range handles, or tick labels while preserving
the component's behavior and accessible controls.

## Props

| Prop | Type | Purpose |
| --- | --- | --- |
| `value`, `defaultValue` | `DateRange` | Controlled or initial inclusive selection. |
| `onValueChange` | `(range) => void` | Live drag, resize, keyboard, preset, and calendar updates. |
| `onValueCommit` | `(range) => void` | Final value after an interaction. |
| `viewport`, `defaultViewport` | `DateRange` | Controlled or initial visible timeline. |
| `onViewportChange` | `(viewport) => void` | Receives adaptive zoom and pan updates. |
| `zoomMode` | `"auto" \| "fixed"` | Refit committed selections or preserve viewport duration. |
| `zoomLevels` | `readonly ZoomLevel[]` | Replace the adaptive thresholds and minimum ranges. |
| `presets` | `readonly DatePreset[]` | Exact static or `today`-resolved shortcuts. |
| `today` | `Date` | Deterministic date for presets and the calendar. |
| `minDate`, `maxDate` | `Date` | Bounds selection, viewport movement, and the calendar. |
| `renderChart` | `(context) => ReactNode` | Render chart content behind the selector. |
| `chartPointerEvents` | `boolean` | Enable events in chart content. |
| `showPanControls` | `boolean` | Show previous and next viewport controls. |
| `chartHeight` | `number` | Timeline chart area height in pixels. |
| `locale`, `weekStartsOn` | date-fns locale, `0`–`6` | Localize labels and calendar weeks. |
| `calendarProps` | `TimelineCalendarProps` | Forward supported React DayPicker options. |
| `formatDateRange` | `(range, context) => ReactNode` | Replace the trigger's range text. |
| `formatTick` | `(date, context) => string` | Replace responsive tick labels. |
| `formatDuration` | `(days, range) => ReactNode` | Replace the selection duration label. |
| `className`, `classNames`, `style` | styling props | Customize the root or individual slots. |
| `components` | `TimelineDateRangePickerComponents` | Replace supported visual subcomponents. |
| `id`, `ariaLabel` | `string` | Stable identity and accessible group label. |
| `disabled` | `boolean` | Disable calendar, preset, pointer, and keyboard changes. |

All public prop, slot, formatter, tick, zoom, and chart types are exported from
the package root.

## Keyboard and touch behavior

- Focus the selection's move control and press an arrow key to move one day.
- Hold Shift with an arrow key to move seven days.
- Focus either slider handle and use the same keys to resize that endpoint.
- Range handles expose formatted values and bounds through ARIA slider
  semantics; committed changes are announced in a polite live region.
- Touch targets are at least 44px. Below the mobile breakpoint, presets scroll
  horizontally and the calendar opens as a labelled modal sheet with one month.

The picker honors `prefers-reduced-motion` by removing nonessential movement
and crossfade transitions.

## License

MIT
