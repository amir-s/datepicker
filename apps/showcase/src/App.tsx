import * as React from "react"
import {
  AccessibilityIcon,
  ArrowRightIcon,
  CalendarRangeIcon,
  ChartNoAxesCombinedIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  GitForkIcon,
  Layers3Icon,
  MoveHorizontalIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  ZoomInIcon,
} from "lucide-react"
import {
  TimelineDateRangePicker,
  type DatePreset,
  type DateRange,
  type TimelineChartContext,
  type ZoomMode,
} from "@amir-s/datepicker"

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
import { Skeleton } from "@/components/ui/skeleton"
import { siteRoute } from "@/lib/site-path"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { TimelineUsageChart } from "@/components/demo/timeline-usage-chart"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"

const ExamplesPage = React.lazy(() =>
  import("@/pages/examples-page").then(module => ({ default: module.ExamplesPage }))
)

const TODAY = new Date(2026, 6, 10)
const MIN_DATE = new Date(2024, 0, 1)
const MAX_DATE = new Date(2026, 11, 31)
const INITIAL_RANGE: DateRange = {
  from: new Date(2026, 5, 4),
  to: new Date(2026, 6, 2),
}
const INITIAL_VIEWPORT: DateRange = {
  from: new Date(2026, 4, 27),
  to: new Date(2026, 6, 10),
}

const INSTALL_COMMAND = "npm install @amir-s/datepicker"

const CODE_SAMPLE = `import { TimelineDateRangePicker } from "@amir-s/datepicker"
import "@amir-s/datepicker/styles.css"

<TimelineDateRangePicker
  value={range}
  onValueChange={setRange}
  zoomMode="auto"
  presets={presets}
  renderChart={(context) => <UsageChart {...context} />}
/>`

const FEATURES = [
  {
    icon: MoveHorizontalIcon,
    title: "Day-snapped gestures",
    description:
      "Move the entire window or resize either edge with mouse, touch, or keyboard.",
  },
  {
    icon: ZoomInIcon,
    title: "Adaptive granularity",
    description:
      "The viewport and minimum selection scale naturally from a single day to multiple years.",
  },
  {
    icon: ChartNoAxesCombinedIcon,
    title: "Chart-ready canvas",
    description:
      "Render any SVG, canvas, or chart library behind the selector with a shared date scale.",
  },
  {
    icon: CalendarRangeIcon,
    title: "Calendar precision",
    description:
      "Open the familiar range calendar whenever dragging is not the right interaction.",
  },
  {
    icon: Layers3Icon,
    title: "Shadcn by design",
    description:
      "Semantic tokens, stable slots, and composable overrides fit into your existing system.",
  },
  {
    icon: AccessibilityIcon,
    title: "Accessible everywhere",
    description:
      "Focus-visible controls, ARIA sliders, live updates, and reduced-motion support are built in.",
  },
] as const

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, amount: number) {
  const next = startOfDay(date)
  next.setDate(next.getDate() + amount)
  return next
}

function calendarDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  )
}

function rangeDays(range: DateRange) {
  return calendarDayNumber(range.to) - calendarDayNumber(range.from) + 1
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatRange(range: DateRange) {
  return `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`
}

const PRESETS: readonly DatePreset[] = [
  {
    id: "last-7-days",
    label: "Last 7 days",
    range: (today) => ({ from: addDays(today, -6), to: startOfDay(today) }),
  },
  {
    id: "last-30-days",
    label: "Last 30 days",
    range: (today) => ({ from: addDays(today, -29), to: startOfDay(today) }),
  },
  {
    id: "this-quarter",
    label: "This quarter",
    range: (today) => ({
      from: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      to: startOfDay(today),
    }),
  },
  {
    id: "year-to-date",
    label: "Year to date",
    range: (today) => ({
      from: new Date(today.getFullYear(), 0, 1),
      to: startOfDay(today),
    }),
  },
]

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"

  const stored = window.localStorage.getItem("datepicker-theme")
  if (stored === "light" || stored === "dark") return stored

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function HomePage() {
  const [range, setRange] = React.useState<DateRange>(INITIAL_RANGE)
  const [viewport, setViewport] =
    React.useState<DateRange>(INITIAL_VIEWPORT)
  const [zoomMode, setZoomMode] = React.useState<ZoomMode>("auto")
  const [copied, setCopied] = React.useState<"install" | "code" | null>(null)
  const [committedRange, setCommittedRange] =
    React.useState<DateRange>(INITIAL_RANGE)

  const copyText = React.useCallback(
    async (text: string, target: "install" | "code") => {
      await navigator.clipboard.writeText(text)
      setCopied(target)
      window.setTimeout(() => setCopied(null), 1600)
    },
    []
  )

  const panViewport = React.useCallback((direction: -1 | 1) => {
    setViewport((current) => {
      const amount = Math.max(1, Math.round(rangeDays(current) * 0.6))
      return {
        from: addDays(current.from, direction * amount),
        to: addDays(current.to, direction * amount),
      }
    })
  }, [])

  const centerViewport = React.useCallback(() => {
    setViewport((current) => {
      const span = rangeDays(current)
      const selectionSpan = rangeDays(range)
      const leadingDays = Math.max(0, Math.floor((span - selectionSpan) / 2))
      const from = addDays(range.from, -leadingDays)
      return { from, to: addDays(from, span - 1) }
    })
  }, [range])

  const renderChart = React.useCallback(
    (context: TimelineChartContext) => <TimelineUsageChart {...context} />,
    []
  )

  return (
    <>
      <main id="top">
        <section className="hero-glow relative px-4 pb-14 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
            <Badge variant="outline" className="mb-6 rounded-full px-3 py-1">
              <SparklesIcon data-icon="inline-start" />
              A timeline picker that understands scale
            </Badge>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Adaptive date ranges,
              <span className="text-muted-foreground"> made tangible.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              A chart-ready React date range picker with intelligent zoom,
              natural gestures, and the composability of shadcn/ui.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <a href="#demo">
                  Try the component
                  <ArrowRightIcon data-icon="inline-end" />
                </a>
              </Button>
              <div className="flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 font-mono text-xs shadow-sm sm:text-sm">
                <span className="text-muted-foreground">$</span>
                <code>{INSTALL_COMMAND}</code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copy install command"
                  onClick={() => copyText(INSTALL_COMMAND, "install")}
                >
                  {copied === "install" ? <CheckIcon /> : <ClipboardIcon />}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="scroll-mt-24 px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Card className="demo-card overflow-hidden py-0 shadow-xl shadow-primary/5">
              <CardHeader className="gap-5 px-4 py-5 sm:px-6 lg:flex lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1.5">
                  <CardTitle className="text-base">Live product activity</CardTitle>
                  <CardDescription>
                    Drag the window, resize its edges, or choose an exact range.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Zoom
                  </span>
                  <ToggleGroup
                    data-testid="zoom-mode-control"
                    type="single"
                    value={zoomMode}
                    onValueChange={(value: string) => {
                      if (value === "auto" || value === "fixed") setZoomMode(value)
                    }}
                    variant="outline"
                    size="sm"
                    spacing={2}
                    aria-label="Timeline zoom behavior"
                  >
                    <ToggleGroupItem value="auto" aria-label="Use adaptive zoom">
                      Adaptive
                    </ToggleGroupItem>
                    <ToggleGroupItem value="fixed" aria-label="Use fixed zoom">
                      Fixed
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Pan viewport backward"
                      onClick={() => panViewport(-1)}
                    >
                      <ChevronLeftIcon />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={centerViewport}>
                      Center
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Pan viewport forward"
                      onClick={() => panViewport(1)}
                    >
                      <ChevronRightIcon />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
                <div data-testid="showcase-picker">
                  <TimelineDateRangePicker
                    id="product-activity-range"
                    ariaLabel="Product activity date range"
                    value={range}
                    onValueChange={setRange}
                    onValueCommit={setCommittedRange}
                    viewport={viewport}
                    onViewportChange={setViewport}
                    zoomMode={zoomMode}
                    presets={PRESETS}
                    today={TODAY}
                    minDate={MIN_DATE}
                    maxDate={MAX_DATE}
                    renderChart={renderChart}
                    chartPointerEvents={false}
                    showPanControls={false}
                  />
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="flex flex-col items-stretch justify-between gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-medium" data-testid="committed-range">
                    {formatRange(committedRange)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rangeDays(committedRange)} inclusive days selected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {zoomMode === "auto" ? "Adaptive viewport" : "Fixed viewport"}
                  </Badge>
                  <Badge variant="outline">{rangeDays(viewport)} days visible</Badge>
                </div>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 bg-muted/35 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4">
                Built for real interfaces
              </Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                One component, every range
              </h2>
              <p className="mt-4 text-pretty leading-7 text-muted-foreground">
                From a day-level operations view to a multi-year report, the same
                interaction stays precise and understandable.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title} className="gap-4 shadow-none">
                    <CardHeader className="gap-4">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section id="api" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="flex flex-col gap-5 lg:sticky lg:top-28">
              <Badge variant="outline">Composable API</Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Designed for real product surfaces
              </h2>
              <p className="text-pretty leading-7 text-muted-foreground">
                Control only what your product owns. Leave the rest to sensible,
                accessible defaults.
              </p>
              <ul className="flex flex-col gap-3 text-sm" aria-label="API highlights">
                {[
                  "Controlled and uncontrolled selection",
                  "Independent viewport state",
                  "Custom presets and zoom levels",
                  "Typed chart scale and slot overrides",
                  "Locale-aware labels and formatters",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <CheckIcon className="size-3" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Card className="overflow-hidden gap-0 py-0">
              <CardHeader className="bg-muted/50 py-3">
                <CardTitle className="font-mono text-sm">
                  TimelineDateRangePicker
                </CardTitle>
                <CardDescription className="font-mono text-xs">example.tsx</CardDescription>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy code sample"
                    onClick={() => copyText(CODE_SAMPLE, "code")}
                  >
                    {copied === "code" ? <CheckIcon /> : <ClipboardIcon />}
                  </Button>
                </CardAction>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                <pre
                  data-testid="code-sample"
                  className="code-scroll overflow-x-auto p-5 text-[13px] leading-6 sm:p-7"
                >
                  <code>{CODE_SAMPLE}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <Card className="relative mx-auto max-w-6xl overflow-hidden shadow-xl">
            <div className="cta-grid pointer-events-none absolute inset-0 text-primary opacity-20" />
            <CardHeader className="relative items-start gap-4 sm:items-center sm:justify-items-center sm:text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <SlidersHorizontalIcon className="size-6" aria-hidden="true" />
              </span>
              <CardTitle className="text-3xl tracking-tight">Start building</CardTitle>
              <CardDescription className="max-w-xl">
                Add an adaptive, chart-ready date range to your next shadcn
                interface in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" asChild>
                <a href="https://github.com/amir-s/datepicker" target="_blank" rel="noreferrer">
                  <GitForkIcon data-icon="inline-start" />
                  View on GitHub
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => copyText(INSTALL_COMMAND, "install")}
              >
                <ClipboardIcon data-icon="inline-start" />
                Copy install command
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

    </>
  )
}

function ExamplesPageFallback() {
  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading examples">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </main>
  )
}

function App() {
  const [theme, setTheme] = React.useState<"light" | "dark">(getInitialTheme)
  const currentPage = siteRoute(window.location.pathname) === "/examples"
    ? "examples"
    : "home"

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem("datepicker-theme", theme)
  }, [theme])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteHeader
        currentPage={currentPage}
        theme={theme}
        onToggleTheme={() => setTheme(current => current === "dark" ? "light" : "dark")}
      />
      {currentPage === "examples" ? (
        <React.Suspense fallback={<ExamplesPageFallback />}>
          <ExamplesPage />
        </React.Suspense>
      ) : (
        <HomePage />
      )}
      <SiteFooter />
    </div>
  )
}

export default App
