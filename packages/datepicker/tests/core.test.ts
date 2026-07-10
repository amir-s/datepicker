import {
  addCalendarDays,
  clampRangeToBounds,
  differenceInCalendarDays,
  inclusiveDayCount,
  normalizeRange,
  toDayOrdinal,
} from "../src/date-math"
import {
  dateToX,
  generateTickCandidates,
  selectResponsiveTicks,
  xToDate,
} from "../src/ticks"
import {
  DEFAULT_ZOOM_LEVELS,
  fitViewportToSelection,
  panViewportToReveal,
  resolveViewportDays,
  selectZoomLevel,
} from "../src/zoom"

function day(year: number, month: number, date: number, hour = 0): Date {
  return new Date(year, month - 1, date, hour)
}

describe("calendar-day math", () => {
  it("counts inclusive ranges across daylight-saving boundaries", () => {
    const beforeSpring = day(2026, 3, 7, 12)
    const afterSpring = day(2026, 3, 9, 12)

    expect(differenceInCalendarDays(afterSpring, beforeSpring)).toBe(2)
    expect(
      inclusiveDayCount({ from: beforeSpring, to: afterSpring }),
    ).toBe(3)
    expect(addCalendarDays(beforeSpring, 2).getDate()).toBe(9)
  })

  it("handles leap days and reversed input", () => {
    const range = normalizeRange({
      from: day(2024, 3, 1, 18),
      to: day(2024, 2, 28, 6),
    })

    expect(range.from.getDate()).toBe(28)
    expect(range.to.getDate()).toBe(1)
    expect(inclusiveDayCount(range)).toBe(3)
    expect(toDayOrdinal(day(2024, 2, 29)) - toDayOrdinal(day(2024, 2, 28))).toBe(1)
  })

  it("crosses month and year boundaries without changing inclusive semantics", () => {
    const range = {
      from: day(2025, 12, 31, 23),
      to: day(2026, 1, 2, 1),
    }

    expect(inclusiveDayCount(range)).toBe(3)
    expect(addCalendarDays(range.from, 1)).toEqual(day(2026, 1, 1))
  })

  it("clamps while preserving duration whenever the domain allows it", () => {
    const clamped = clampRangeToBounds(
      { from: day(2026, 1, 1), to: day(2026, 1, 7) },
      day(2026, 1, 5),
      day(2026, 1, 31),
    )

    expect(clamped).toEqual({
      from: day(2026, 1, 5),
      to: day(2026, 1, 11),
    })
    expect(inclusiveDayCount(clamped)).toBe(7)
  })

  it("uses the whole domain when it is shorter than the range", () => {
    expect(
      clampRangeToBounds(
        { from: day(2026, 1, 1), to: day(2026, 1, 31) },
        day(2026, 1, 10),
        day(2026, 1, 20),
      ),
    ).toEqual({ from: day(2026, 1, 10), to: day(2026, 1, 20) })
  })
})

describe("adaptive zoom", () => {
  it("selects every default threshold and minimum", () => {
    expect(selectZoomLevel(7).id).toBe("two-weeks")
    expect(selectZoomLevel(8).id).toBe("six-weeks")
    expect(selectZoomLevel(32).id).toBe("four-months")
    expect(selectZoomLevel(93).id).toBe("thirteen-months")
    expect(selectZoomLevel(367).id).toBe("multi-year")
    expect(selectZoomLevel(367).minSelectionDays).toBe(30)
  })

  it("rounds the multi-year viewport up to a 30-day month bucket", () => {
    const level = selectZoomLevel(367)
    expect(resolveViewportDays(level, 367)).toBe(450)
  })

  it("centers an even viewport around a one-day range", () => {
    const selection = { from: day(2026, 1, 10), to: day(2026, 1, 10) }
    expect(fitViewportToSelection(selection, DEFAULT_ZOOM_LEVELS[0]!)).toEqual({
      from: day(2026, 1, 4),
      to: day(2026, 1, 17),
    })
  })

  it("shifts a centered viewport at bounds without shortening it", () => {
    const viewport = fitViewportToSelection(
      { from: day(2026, 1, 10), to: day(2026, 1, 10) },
      DEFAULT_ZOOM_LEVELS[0]!,
      { minDate: day(2026, 1, 8), maxDate: day(2026, 2, 1) },
    )
    expect(viewport).toEqual({
      from: day(2026, 1, 8),
      to: day(2026, 1, 21),
    })
  })

  it("pans a fixed viewport just enough to reveal a selection", () => {
    const viewport = { from: day(2026, 1, 1), to: day(2026, 1, 14) }
    expect(
      panViewportToReveal(viewport, {
        from: day(2026, 1, 13),
        to: day(2026, 1, 16),
      }),
    ).toEqual({ from: day(2026, 1, 3), to: day(2026, 1, 16) })
  })

  it("does not mutate a fixed viewport for an oversized selection", () => {
    const viewport = { from: day(2026, 1, 1), to: day(2026, 1, 14) }
    expect(
      panViewportToReveal(viewport, {
        from: day(2026, 1, 1),
        to: day(2026, 1, 15),
      }),
    ).toEqual(viewport)
  })
})

describe("timeline scale and ticks", () => {
  const viewport = { from: day(2026, 1, 1), to: day(2026, 1, 10) }

  it("maps inclusive day cells and snaps pixels back to days", () => {
    expect(dateToX(day(2026, 1, 1), viewport, 100, "start")).toBe(0)
    expect(dateToX(day(2026, 1, 1), viewport, 100)).toBe(5)
    expect(dateToX(day(2026, 1, 10), viewport, 100, "end")).toBe(100)
    expect(xToDate(0, viewport, 100)).toEqual(day(2026, 1, 1))
    expect(xToDate(99, viewport, 100)).toEqual(day(2026, 1, 10))
    expect(xToDate(100, viewport, 100)).toEqual(day(2026, 1, 10))
  })

  it("aligns weekly candidates to the configured first weekday", () => {
    const dates = generateTickCandidates(
      { from: day(2026, 1, 3), to: day(2026, 1, 20) },
      { unit: "week", step: 1 },
      { weekStartsOn: 1 },
    )
    expect(dates.map(date => date.getDate())).toEqual([3, 5, 12, 19, 20])
  })

  it("chooses the densest measured interval and keeps positions in pixels", () => {
    const ticks = selectResponsiveTicks(viewport, 1_000, {
      measureText: () => 20,
      minGap: 8,
    })
    expect(ticks[0]?.interval).toEqual({ unit: "day", step: 1 })
    expect(ticks[0]?.position).toBe(0)
    expect(ticks.at(-1)?.position).toBe(1_000)
  })

  it("keeps the aligned interval stable when only a boundary label collides", () => {
    const options = {
      intervals: [
        { unit: "week", step: 1 },
        { unit: "month", step: 1 },
      ] as const,
      weekStartsOn: 0 as const,
      minGap: 12,
      measureText: () => 44,
      formatTick: (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`,
    }
    const before = selectResponsiveTicks(
      { from: day(2026, 4, 23), to: day(2026, 6, 6) },
      1_050,
      options,
    )
    const shifted = selectResponsiveTicks(
      { from: day(2026, 4, 24), to: day(2026, 6, 7) },
      1_050,
      options,
    )

    expect(before[0]?.interval).toEqual({ unit: "week", step: 1 })
    expect(shifted[0]?.interval).toEqual({ unit: "week", step: 1 })
    expect(shifted[0]?.date).toEqual(day(2026, 4, 24))
    expect(shifted.at(-1)?.date).toEqual(day(2026, 6, 7))
    expect(shifted.map(tick => tick.date.getDate())).not.toContain(26)
    expect(shifted.map(tick => tick.date.getDate())).toContain(3)
  })

  it("rejects a dense interval when boundary trimming removes every interior tick", () => {
    const ticks = selectResponsiveTicks(
      { from: day(2026, 1, 1), to: day(2026, 1, 3) },
      100,
      {
        intervals: [
          { unit: "day", step: 1 },
          { unit: "month", step: 1 },
        ],
        minGap: 12,
        measureText: () => 30,
      },
    )

    expect(ticks[0]?.interval).toEqual({ unit: "month", step: 1 })
  })

  it("falls back to a single boundary when even both endpoints collide", () => {
    const ticks = selectResponsiveTicks(viewport, 40, {
      measureText: () => 30,
      minGap: 12,
    })
    expect(ticks).toHaveLength(1)
    expect(ticks[0]?.isBoundary).toBe(true)
  })
})
