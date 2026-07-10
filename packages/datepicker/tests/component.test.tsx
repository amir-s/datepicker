import * as React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi } from "vitest"

import { TimelineDateRangePicker } from "../src/timeline-date-range-picker"
import type { DatePreset, DateRange, TimelineChartContext } from "../src/types"

const TODAY = new Date(2026, 6, 10)
const WEEK: DateRange = {
  from: new Date(2026, 6, 4),
  to: new Date(2026, 6, 10),
}
const MONTH_VIEW: DateRange = {
  from: new Date(2026, 5, 20),
  to: new Date(2026, 7, 3),
}

const PRESETS: DatePreset[] = [
  {
    id: "last-seven",
    label: "Last seven",
    range: today => ({ from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), to: today }),
  },
  {
    id: "quarter",
    label: "Quarter",
    range: { from: new Date(2026, 3, 1), to: new Date(2026, 5, 30) },
  },
]

describe("TimelineDateRangePicker", () => {
  it("resolves a dynamic preset, selects it exactly, and commits once", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onValueCommit = vi.fn()

    render(
      <TimelineDateRangePicker
        defaultValue={{ from: new Date(2026, 6, 8), to: new Date(2026, 6, 10) }}
        today={TODAY}
        presets={PRESETS}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Last seven" }))

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueCommit).toHaveBeenCalledTimes(1)
    expect(onValueCommit.mock.calls[0]?.[0]).toEqual(WEEK)
    expect(screen.getByRole("button", { name: "Last seven" })).toHaveAttribute("aria-pressed", "true")
  })

  it("keeps a controlled value authoritative", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <TimelineDateRangePicker
        value={{ from: new Date(2026, 6, 8), to: new Date(2026, 6, 10) }}
        today={TODAY}
        presets={PRESETS}
        onValueChange={onValueChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Last seven" }))

    expect(onValueChange).toHaveBeenCalledWith(WEEK)
    expect(screen.getByRole("button", { name: "Last seven" })).toHaveAttribute("aria-pressed", "false")
  })

  it("moves the range by one day or seven days from the keyboard", async () => {
    const user = userEvent.setup()
    const onValueCommit = vi.fn()

    render(
      <TimelineDateRangePicker
        defaultValue={WEEK}
        defaultViewport={MONTH_VIEW}
        zoomMode="fixed"
        onValueCommit={onValueCommit}
      />,
    )

    const move = screen.getByRole("button", { name: /Move selected range/ })
    move.focus()
    await user.keyboard("{ArrowRight}")
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}")

    expect(onValueCommit).toHaveBeenCalledTimes(2)
    expect(onValueCommit.mock.calls[0]?.[0]).toEqual({
      from: new Date(2026, 6, 5),
      to: new Date(2026, 6, 11),
    })
    expect(onValueCommit.mock.calls[1]?.[0]).toEqual({
      from: new Date(2026, 6, 12),
      to: new Date(2026, 6, 18),
    })
  })

  it("disables presets that cannot fit inside a fixed viewport", () => {
    render(
      <TimelineDateRangePicker
        defaultValue={WEEK}
        defaultViewport={MONTH_VIEW}
        zoomMode="fixed"
        today={TODAY}
        presets={PRESETS}
      />,
    )

    expect(screen.getByRole("button", { name: "Quarter" })).toBeDisabled()
  })

  it("enforces the active fixed-zoom minimum for exact presets", () => {
    render(
      <TimelineDateRangePicker
        defaultValue={WEEK}
        defaultViewport={{ from: new Date(2026, 0, 1), to: new Date(2027, 1, 4) }}
        zoomMode="fixed"
        today={TODAY}
        presets={[
          {
            id: "single-day",
            label: "Single day",
            range: today => ({ from: today, to: today }),
          },
        ]}
      />,
    )

    expect(screen.getByRole("button", { name: "Single day" })).toBeDisabled()
  })

  it("reports custom functional zoom levels from the resolved viewport", () => {
    const { container } = render(
      <TimelineDateRangePicker
        defaultValue={{ from: new Date(2026, 6, 1), to: new Date(2026, 6, 8) }}
        zoomLevels={[
          { id: "compact", maxSelectionDays: 7, viewportDays: 14, minSelectionDays: 1 },
          {
            id: "dynamic",
            maxSelectionDays: 31,
            viewportDays: selectionDays => selectionDays + 37,
            minSelectionDays: 2,
          },
          { id: "wide", maxSelectionDays: Number.POSITIVE_INFINITY, viewportDays: 120, minSelectionDays: 7 },
        ]}
      />,
    )

    expect(container.querySelector('[data-slot="root"]')).toHaveAttribute("data-zoom-level", "dynamic")
  })

  it("provides measured scale context to a chart and renders responsive ticks", async () => {
    const chart = vi.fn((context: TimelineChartContext) => (
      <output data-testid="chart-context">{context.width}:{Math.round(context.x(context.viewport.to, "end"))}</output>
    ))

    render(
      <TimelineDateRangePicker
        defaultValue={WEEK}
        defaultViewport={MONTH_VIEW}
        renderChart={chart}
      />,
    )

    await waitFor(() => expect(screen.getByTestId("chart-context")).toHaveTextContent("720:720"))
    expect(chart).toHaveBeenCalled()
    expect(within(screen.getByTestId("datepicker-track")).getAllByText(/Jun|Jul|Aug/).length).toBeGreaterThan(1)
  })

  it("keeps a calendar draft open, commits a complete range, and restores focus", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onValueCommit = vi.fn()

    render(
      <TimelineDateRangePicker
        defaultValue={WEEK}
        today={new Date(2026, 6, 6)}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    )

    const trigger = screen.getByRole("button", { name: /Choose date range/ })
    await user.click(trigger)

    const calendars = await screen.findAllByRole("grid")
    expect(calendars).toHaveLength(2)
    expect(calendars[0]).toBeVisible()
    expect(screen.getByRole("button", { name: "Today, Monday, July 6th, 2026, selected" })).toBeVisible()
    expect(screen.getByRole("slider", { name: "Start date" })).toBeVisible()
    expect(screen.getByRole("slider", { name: "End date" })).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Sunday, July 12th, 2026" }))
    expect(onValueCommit).not.toHaveBeenCalled()
    expect(calendars[0]).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Tuesday, July 14th, 2026" }))
    expect(onValueChange).toHaveBeenCalledWith({
      from: new Date(2026, 6, 12),
      to: new Date(2026, 6, 14),
    })
    expect(onValueCommit).toHaveBeenCalledWith({
      from: new Date(2026, 6, 12),
      to: new Date(2026, 6, 14),
    })
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("uses custom formatters and exposes stable part attributes and classes", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <TimelineDateRangePicker
        defaultValue={WEEK}
        className="consumer-root"
        classNames={{ selection: "consumer-selection", calendar: "consumer-calendar" }}
        formatDateRange={() => "Custom range"}
        formatDuration={days => `${days} inclusive`}
      />,
    )

    expect(container.querySelector('[data-slot="root"]')).toHaveClass("consumer-root")
    expect(container.querySelector('[data-slot="selection"]')).toHaveClass("consumer-selection")
    expect(screen.getByText("Custom range")).toBeVisible()
    expect(screen.getByText("7 inclusive")).toBeVisible()

    await user.click(screen.getByRole("button", { name: /Choose date range/ }))
    expect(document.querySelector('[data-slot="calendar"]')).toHaveClass("consumer-calendar")
  })
})
