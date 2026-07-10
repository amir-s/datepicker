# @amir-s/datepicker

An adaptive, chart-ready timeline date range picker for React. It combines a
draggable day-snapped selection, responsive date labels, presets, adaptive
zoom, and a conventional range calendar in one shadcn-compatible component.

The visual direction is inspired by [RangeFlow](https://rangeflow.raminmousavi.dev),
with a public API designed for controlled product surfaces and custom charts.

## Highlights

- Drag the complete range or resize either edge with pointer, touch, or keyboard.
- Snap every interaction to local calendar days, with inclusive endpoints.
- Automatically fit short, monthly, yearly, and multi-year selections, or keep
  a controlled fixed viewport.
- Render any React chart behind the selection using date-to-pixel scale helpers.
- Choose exact ranges from custom presets or a responsive two-month/one-month
  calendar.
- Adapt ticks to the available width without changing the selected dates or
  viewport.
- Theme through shadcn semantic tokens, scoped CSS, slot classes, data
  attributes, or component overrides.
- Support React 18 and React 19, ESM and CommonJS consumers, reduced motion,
  and mobile bottom-sheet behavior.

## Install

```bash
npm install @amir-s/datepicker
```

Import the component and its scoped stylesheet once in your application:

```tsx
import {
  TimelineDateRangePicker,
  type DatePreset,
} from "@amir-s/datepicker"
import "@amir-s/datepicker/styles.css"

const day = (year: number, month: number, date: number) =>
  new Date(year, month - 1, date)

const presets: DatePreset[] = [
  {
    id: "last-7-days",
    label: "Last 7 days",
    range: today => ({
      from: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6,
      ),
      to: today,
    }),
  },
]

export function AnalyticsRange() {
  return (
    <TimelineDateRangePicker
      ariaLabel="Analytics date range"
      defaultValue={{ from: day(2026, 7, 1), to: day(2026, 7, 10) }}
      presets={presets}
      showPanControls
    />
  )
}
```

The package uses shadcn's semantic variables when they are present and ships
standalone fallbacks. It does not install global resets, so it can be placed in
an existing Tailwind v4/shadcn application without replacing local components.

See the [package guide](./packages/datepicker/README.md) for controlled state,
chart rendering, zoom configuration, styling slots, and the complete prop
reference.

## Workspaces

```text
packages/datepicker  Published React/TypeScript library
apps/showcase        Vite + Tailwind v4 interactive showcase
e2e                  Cross-browser Playwright coverage
```

Run the showcase locally:

```bash
npm install
npm run dev
```

Open `http://localhost:5173/examples` for the example gallery. It includes a
Recharts stacked-bar timeline, a fixed service-health viewport, a compact
uncontrolled report filter, and a branded travel picker with custom visual
components and zoom levels.

## GitHub Pages

The showcase is configured for
[`https://amir-s.github.io/datepicker/`](https://amir-s.github.io/datepicker/).
Pushes to `main` build the library and showcase with the `/datepicker/` base
path, then deploy `apps/showcase/dist` through the `github-pages` environment.
The examples page is emitted as a static nested entry so direct visits and
refreshes work without a client-side 404 fallback.

Before opening a pull request, run:

```bash
npm run verify
npm run test:e2e
```

`npm run test:package` packs the built library and compiles isolated React 18
and React 19 consumers from the tarball. Browser tests cover Chromium, Firefox,
WebKit, and a mobile WebKit profile.

## Date and state model

`DateRange` endpoints are inclusive local calendar days. Inputs are normalized
to local day starts, and movement uses calendar-day arithmetic so daylight
saving transitions do not create partial-day selections.

Selection and viewport are independently controllable. Use `value` with
`onValueChange` for live selection updates, `onValueCommit` for persistence,
and `viewport` with `onViewportChange` when the surrounding screen owns zoom or
pan state. Uncontrolled equivalents are available through `defaultValue` and
`defaultViewport`.

## License

[MIT](./LICENSE)
