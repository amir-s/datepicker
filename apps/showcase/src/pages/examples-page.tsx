import * as React from "react"
import {
  ArrowLeftIcon,
  BarChart3Icon,
  CalendarRangeIcon,
  FileDownIcon,
  GripVerticalIcon,
  PlaneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"
import {
  TimelineDateRangePicker,
  addCalendarDays,
  inclusiveDayCount,
  startOfCalendarDay,
  type DatePreset,
  type DateRange,
  type TimelineRangeHandleProps,
  type TimelineSelectionLabelProps,
  type ZoomLevel,
} from "@amirs/datepicker"

import { ServiceHealthChart } from "@/components/examples/service-health-chart"
import { StackedRevenueChart } from "@/components/examples/stacked-revenue-chart"
import { TravelRateChart } from "@/components/examples/travel-rate-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { siteHref } from "@/lib/site-path"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const TODAY = new Date(2026, 6, 10)
const DAY_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const REVENUE_PRESETS: readonly DatePreset[] = [
  {
    id: "revenue-7d",
    label: "7 days",
    range: today => ({ from: addCalendarDays(today, -6), to: today }),
  },
  {
    id: "revenue-30d",
    label: "30 days",
    range: today => ({ from: addCalendarDays(today, -29), to: today }),
  },
  {
    id: "revenue-quarter",
    label: "Quarter",
    range: today => ({
      from: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      to: today,
    }),
  },
]

const REPORT_PRESETS: readonly DatePreset[] = [
  {
    id: "report-7d",
    label: "7D",
    range: today => ({ from: addCalendarDays(today, -6), to: today }),
  },
  {
    id: "report-30d",
    label: "30D",
    range: today => ({ from: addCalendarDays(today, -29), to: today }),
  },
  {
    id: "report-ytd",
    label: "YTD",
    range: today => ({ from: new Date(today.getFullYear(), 0, 1), to: today }),
  },
]

const TRAVEL_PRESETS: readonly DatePreset[] = [
  {
    id: "travel-weekend",
    label: "Weekend",
    range: today => ({
      from: addCalendarDays(today, 1),
      to: addCalendarDays(today, 3),
    }),
  },
  {
    id: "travel-week",
    label: "1 week",
    range: today => ({
      from: addCalendarDays(today, 7),
      to: addCalendarDays(today, 13),
    }),
  },
  {
    id: "travel-fortnight",
    label: "2 weeks",
    range: today => ({
      from: addCalendarDays(today, 7),
      to: addCalendarDays(today, 20),
    }),
  },
]

const TRAVEL_ZOOM_LEVELS: readonly ZoomLevel[] = [
  { id: "travel-fortnight", maxSelectionDays: 7, viewportDays: 14, minSelectionDays: 1 },
  { id: "travel-season", maxSelectionDays: 31, viewportDays: 62, minSelectionDays: 1 },
  {
    id: "travel-year",
    maxSelectionDays: Number.POSITIVE_INFINITY,
    viewportDays: 400,
    minSelectionDays: 7,
  },
]

function formatRange(range: DateRange) {
  return `${DAY_FORMATTER.format(range.from)} – ${DAY_FORMATTER.format(range.to)}`
}

function rangeCenteredOn(value: DateRange, days: number): DateRange {
  const selectedDays = inclusiveDayCount(value)
  const before = Math.floor((days - selectedDays) / 2)
  const from = addCalendarDays(value.from, -before)
  return { from, to: addCalendarDays(from, days - 1) }
}

function ExampleBadges({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">{children}</div>
}

function TravelSelectionLabel({ durationDays }: TimelineSelectionLabelProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlaneIcon className="size-3.5" aria-hidden="true" />
      {durationDays} day trip
    </span>
  )
}

function TravelRangeHandle({ edge }: TimelineRangeHandleProps) {
  return (
    <span className="example-travel-grip" aria-hidden="true">
      <GripVerticalIcon className="size-3.5" />
      <span className="sr-only">Resize {edge} date</span>
    </span>
  )
}

function StackedRevenueExample() {
  const [value, setValue] = React.useState<DateRange>({
    from: addCalendarDays(TODAY, -29),
    to: TODAY,
  })
  const [viewport, setViewport] = React.useState<DateRange>(
    rangeCenteredOn(value, 45)
  )
  const selectedDays = inclusiveDayCount(value)
  const selectedRevenue = selectedDays * 1840 + Math.round(selectedDays * selectedDays * 2.4)

  return (
    <Card data-testid="example-stacked-bars" className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="gap-3 px-4 py-5 has-data-[slot=card-action]:grid-cols-1 sm:px-6 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <BarChart3Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle role="heading" aria-level={2}>Revenue mix</CardTitle>
            <CardDescription>
              Recharts stacked bars share the picker&apos;s responsive viewport.
            </CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-span-1 row-start-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
          <ExampleBadges>
            <Badge variant="secondary">Controlled</Badge>
            <Badge variant="outline">Recharts</Badge>
            <Badge variant="outline">Auto zoom</Badge>
          </ExampleBadges>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="px-3 py-5 sm:px-6">
        <TimelineDateRangePicker
          id="revenue-range"
          ariaLabel="Revenue reporting range"
          className="example-picker-stacked"
          classNames={{
            selection: "example-picker-stacked-selection",
            tickLabel: "example-picker-tabular",
          }}
          value={value}
          onValueChange={setValue}
          viewport={viewport}
          onViewportChange={setViewport}
          presets={REVENUE_PRESETS}
          today={TODAY}
          minDate={new Date(2025, 0, 1)}
          maxDate={TODAY}
          renderChart={context => <StackedRevenueChart {...context} />}
          chartHeight={136}
        />
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="font-medium tabular-nums">${selectedRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Estimated selected-period revenue</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground" aria-label="Revenue series legend">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-1" />Subscriptions</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-2" />Expansion</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-3" />Services</span>
        </div>
      </CardFooter>
    </Card>
  )
}

function ServiceHealthExample() {
  const [value, setValue] = React.useState<DateRange>({
    from: addCalendarDays(TODAY, -6),
    to: TODAY,
  })
  const [visibleDays, setVisibleDays] = React.useState("90")
  const [viewport, setViewport] = React.useState<DateRange>(() =>
    rangeCenteredOn({ from: addCalendarDays(TODAY, -6), to: TODAY }, 90)
  )

  const updateVisibleDays = (next: string) => {
    if (!next) return
    const days = Number(next)
    setVisibleDays(next)
    setViewport(rangeCenteredOn(value, days))
  }

  return (
    <Card data-testid="example-fixed-window" className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="gap-4 px-4 py-5 has-data-[slot=card-action]:grid-cols-1 sm:px-6 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <ShieldCheckIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle role="heading" aria-level={2}>Service health window</CardTitle>
            <CardDescription>Fixed zoom, external viewport controls, and status lanes.</CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-span-1 row-start-2 flex flex-col items-start gap-2 justify-self-stretch sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:items-end sm:justify-self-end">
          <ExampleBadges>
            <Badge variant="secondary">Fixed viewport</Badge>
            <Badge variant="outline">SVG chart</Badge>
          </ExampleBadges>
          <ToggleGroup
            type="single"
            value={visibleDays}
            onValueChange={updateVisibleDays}
            variant="outline"
            size="sm"
            aria-label="Visible time span"
          >
            <ToggleGroupItem value="30">30D</ToggleGroupItem>
            <ToggleGroupItem value="90">90D</ToggleGroupItem>
            <ToggleGroupItem value="180">180D</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="px-3 py-5 sm:px-6">
        <TimelineDateRangePicker
          id="service-health-range"
          ariaLabel="Service health investigation range"
          className="example-picker-contrast"
          classNames={{
            selection: "example-picker-contrast-selection",
            tickLabel: "example-picker-mono",
          }}
          value={value}
          onValueChange={setValue}
          viewport={viewport}
          onViewportChange={setViewport}
          zoomMode="fixed"
          today={TODAY}
          minDate={new Date(2025, 0, 1)}
          maxDate={new Date(2027, 0, 1)}
          renderChart={context => <ServiceHealthChart {...context} />}
          chartHeight={132}
          showPanControls
        />
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm sm:px-6">
        <span>{formatRange(value)}</span>
        <span className="text-muted-foreground">3 services · 4 incident clusters</span>
      </CardFooter>
    </Card>
  )
}

function CompactReportExample() {
  const initialValue = React.useMemo<DateRange>(() => ({
    from: addCalendarDays(TODAY, -6),
    to: TODAY,
  }), [])
  const [committed, setCommitted] = React.useState<DateRange>(initialValue)

  return (
    <Card data-testid="example-compact" className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="gap-3 px-4 py-5 has-data-[slot=card-action]:grid-cols-1 sm:px-6 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileDownIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle role="heading" aria-level={2}>Compact report filter</CardTitle>
            <CardDescription>A flat, uncontrolled picker with custom formatters and no chart.</CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-span-1 row-start-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
          <ExampleBadges>
            <Badge variant="secondary">Uncontrolled</Badge>
            <Badge variant="outline">No chart</Badge>
            <Badge variant="outline">Formatters</Badge>
          </ExampleBadges>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="px-3 py-5 sm:px-6">
        <TimelineDateRangePicker
          id="report-filter-range"
          ariaLabel="Report export range"
          className="example-picker-minimal"
          classNames={{
            header: "example-picker-minimal-header",
            timeline: "example-picker-minimal-timeline",
            selection: "example-picker-minimal-selection",
            selectionLabel: "example-picker-mono",
            tickLabel: "example-picker-mono",
          }}
          defaultValue={initialValue}
          onValueCommit={setCommitted}
          presets={REPORT_PRESETS}
          today={TODAY}
          formatDateRange={range => `${range.from.toLocaleDateString("en", { month: "short", day: "numeric" })} → ${range.to.toLocaleDateString("en", { month: "short", day: "numeric" })}`}
          formatDuration={days => `${days}d`}
          formatTick={date => date.toLocaleDateString("en", { month: "short", day: "numeric" })}
        />
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="text-sm font-medium">Report will include {inclusiveDayCount(committed)} days</p>
          <p className="text-xs text-muted-foreground">{formatRange(committed)}</p>
        </div>
        <Button variant="outline" size="sm">
          <FileDownIcon data-icon="inline-start" />
          Export report
        </Button>
      </CardFooter>
    </Card>
  )
}

function TravelSeasonExample() {
  const [value, setValue] = React.useState<DateRange>({
    from: addCalendarDays(TODAY, 7),
    to: addCalendarDays(TODAY, 20),
  })
  const tripDays = inclusiveDayCount(value)

  return (
    <Card data-testid="example-travel" className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="gap-3 px-4 py-5 has-data-[slot=card-action]:grid-cols-1 sm:px-6 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <PlaneIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle role="heading" aria-level={2}>Travel season</CardTitle>
            <CardDescription>Branded labels, handles, zoom levels, and nightly-rate dots.</CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-span-1 row-start-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
          <ExampleBadges>
            <Badge variant="secondary">Component overrides</Badge>
            <Badge variant="outline">Custom zoom</Badge>
          </ExampleBadges>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="px-3 py-5 sm:px-6">
        <TimelineDateRangePicker
          id="travel-season-range"
          ariaLabel="Travel booking dates"
          className="example-picker-travel"
          classNames={{
            selection: "example-picker-travel-selection",
            tickLabel: "example-picker-travel-tick",
          }}
          value={value}
          onValueChange={setValue}
          presets={TRAVEL_PRESETS}
          today={TODAY}
          minDate={startOfCalendarDay(TODAY)}
          maxDate={addCalendarDays(TODAY, 365)}
          zoomLevels={TRAVEL_ZOOM_LEVELS}
          components={{
            SelectionLabel: TravelSelectionLabel,
            RangeHandle: TravelRangeHandle,
          }}
          renderChart={context => <TravelRateChart {...context} />}
          chartHeight={132}
        />
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm sm:px-6">
        <span>{formatRange(value)}</span>
        <span className="font-medium tabular-nums">${(148 + tripDays * 3).toLocaleString()} avg / night</span>
      </CardFooter>
    </Card>
  )
}

export function ExamplesPage() {
  return (
    <main id="examples" data-testid="examples-page">
      <section className="hero-glow relative px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <Badge variant="outline" className="mb-5 rounded-full px-3 py-1">
            <SparklesIcon data-icon="inline-start" />
            Example gallery
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
            One picker, many product surfaces.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty leading-7 text-muted-foreground sm:text-lg">
            Mix charts, controlled viewports, custom formatters, and visual overrides without changing the date interaction model.
          </p>
          <Button variant="outline" className="mt-7" asChild>
            <a href={siteHref()}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back to overview
            </a>
          </Button>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <StackedRevenueExample />
          <ServiceHealthExample />
          <CompactReportExample />
          <TravelSeasonExample />
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-6xl border-dashed shadow-none">
          <CardHeader className="justify-items-center gap-3 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <CalendarRangeIcon className="size-5" aria-hidden="true" />
            </span>
            <CardTitle role="heading" aria-level={2}>Start from any example</CardTitle>
            <CardDescription className="max-w-2xl">
              Every treatment above uses the same exported component and semantic shadcn tokens; only state, render props, and scoped part classes change.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  )
}
