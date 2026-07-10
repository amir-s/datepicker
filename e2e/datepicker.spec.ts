import { expect, test } from "@playwright/test"

import type { Locator, Page } from "@playwright/test"

const showcasePicker = (page: Page) => page.getByTestId("showcase-picker")

const pickerRoot = (page: Page) =>
  page
    .locator(
      '[data-testid="showcase-picker"][data-slot="root"], [data-testid="showcase-picker"] [data-slot="root"]',
    )
    .first()

const pickerSlot = (page: Page, name: string) =>
  showcasePicker(page).locator(`[data-slot="${name}"]`)

async function dragBy(page: Page, locator: Locator, deltaX: number) {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Expected the drag control to have a bounding box")

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + deltaX, y, { steps: 8 })
  await page.mouse.up()
}

async function waitForAnimations(locator: Locator) {
  await locator.evaluate(element =>
    Promise.all(element.getAnimations().map(animation => animation.finished)),
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: /Adaptive date ranges/i }),
  ).toBeVisible()
  await expect(pickerRoot(page)).toBeVisible()
})

test("renders the showcase and exposes the accessible picker surface", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "One component, every range" }),
  ).toBeAttached()
  await expect(
    page.getByRole("heading", { name: "Designed for real product surfaces" }),
  ).toBeAttached()
  await expect(page.getByText("Start building", { exact: true })).toBeAttached()
  await expect(page.getByRole("link", { name: "RangeFlow" })).toHaveAttribute(
    "href",
    "https://rangeflow.raminmousavi.dev/",
  )
  await expect(page.getByText(/designed and built with AI assistance/i)).toBeVisible()

  await expect(pickerRoot(page)).toHaveAttribute("data-zoom-level", "six-weeks")
  await expect(pickerSlot(page, "date-trigger")).toBeVisible()
  await expect(pickerSlot(page, "move-control")).toHaveAccessibleName(
    /move selected range/i,
  )
  await expect(pickerSlot(page, "start-handle")).toHaveAttribute("role", "slider")
  await expect(pickerSlot(page, "end-handle")).toHaveAttribute("role", "slider")
  await expect(page.getByTestId("chart-layer")).toHaveAttribute(
    "aria-label",
    "Daily product activity behind the selected date range",
  )

  await expect(page.getByRole("radio", { name: "Use adaptive zoom" })).toBeChecked()
  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("presets commit exact dates and keyboard movement remains day-snapped", async ({
  page,
}) => {
  const preset = page.getByRole("button", { name: "Last 7 days", exact: true })
  await preset.click()

  await expect(preset).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("committed-range")).toHaveText(
    "Jul 4, 2026 – Jul 10, 2026",
  )
  await expect(pickerRoot(page)).toHaveAttribute("data-zoom-level", "two-weeks")

  const before = await page.getByTestId("committed-range").textContent()
  await pickerSlot(page, "move-control").focus()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByTestId("committed-range")).not.toHaveText(before ?? "")
  await expect(page.getByTestId("committed-range")).toHaveText(
    "Jul 3, 2026 – Jul 9, 2026",
  )
  await expect(pickerSlot(page, "live-region")).toContainText(/July 3.*July 9/i)
})

test("the selection body and both edges support pointer gestures", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name === "mobile-webkit", "Covered by the touch test")

  await page.getByRole("button", { name: "Last 7 days", exact: true }).click()
  const selection = pickerSlot(page, "selection")
  await waitForAnimations(selection)

  const committed = page.getByTestId("committed-range")
  const initialRange = await committed.textContent()
  await dragBy(page, pickerSlot(page, "move-control"), -80)
  await expect(committed).not.toHaveText(initialRange ?? "")

  await waitForAnimations(selection)
  const endHandle = pickerSlot(page, "end-handle")
  const initialEnd = await endHandle.getAttribute("aria-valuetext")
  await dragBy(page, endHandle, -80)
  await expect(endHandle).not.toHaveAttribute("aria-valuetext", initialEnd ?? "")

  await waitForAnimations(selection)
  const startHandle = pickerSlot(page, "start-handle")
  const initialStart = await startHandle.getAttribute("aria-valuetext")
  await dragBy(page, startHandle, 80)
  await expect(startHandle).not.toHaveAttribute("aria-valuetext", initialStart ?? "")
})

test("responsive ticks change density without changing selection or zoom", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name === "mobile-webkit", "Uses a dedicated mobile viewport test")

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole("button", { name: "Year to date", exact: true }).click()
  await expect(pickerRoot(page)).toHaveAttribute("data-zoom-level", "thirteen-months")

  const selection = await page.getByTestId("committed-range").textContent()
  const zoomLevel = await pickerRoot(page).getAttribute("data-zoom-level")
  const wideTickCount = await pickerSlot(page, "tick").count()
  expect(wideTickCount).toBeGreaterThan(2)

  await page.setViewportSize({ width: 420, height: 900 })
  await expect
    .poll(() => pickerSlot(page, "tick").count())
    .toBeLessThan(wideTickCount)
  await expect(page.getByTestId("committed-range")).toHaveText(selection ?? "")
  await expect(pickerRoot(page)).toHaveAttribute(
    "data-zoom-level",
    zoomLevel ?? "thirteen-months",
  )
})

test("the chart stays behind the selector and reduced motion removes transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.reload()

  const chart = pickerSlot(page, "chart")
  const selection = pickerSlot(page, "selection")
  await expect(page.getByTestId("chart-layer")).toBeVisible()
  await expect(chart).toHaveCSS("pointer-events", "none")

  const chartPrecedesSelection = await selection.evaluate(
    element => element.previousElementSibling?.matches('[data-slot="chart"]') ?? false,
  )
  expect(chartPrecedesSelection).toBe(true)
  await expect(pickerSlot(page, "move-control")).toHaveCSS("pointer-events", "auto")

  const longestTransitionMs = await selection.evaluate(element => {
    const durations = getComputedStyle(element).transitionDuration.split(",")
    return Math.max(
      ...durations.map(duration => {
        const value = Number.parseFloat(duration)
        return duration.trim().endsWith("ms") ? value : value * 1_000
      }),
    )
  })
  expect(longestTransitionMs).toBeLessThanOrEqual(1)
})

test("mobile uses touch-sized controls and a one-month modal sheet", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "mobile-webkit", "Mobile-only behavior")

  const headerDirection = await pickerSlot(page, "header").evaluate(
    element => getComputedStyle(element).flexDirection,
  )
  expect(headerDirection).toBe("column")

  for (const slot of ["date-trigger", "start-handle", "end-handle"]) {
    const box = await pickerSlot(page, slot).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  await pickerSlot(page, "date-trigger").click()
  const dialog = page.getByRole("dialog", { name: "Choose a date range" })
  await expect(dialog).toBeVisible()
  await waitForAnimations(dialog)
  const calendar = dialog.locator('[data-slot="calendar"]')
  await expect(calendar).toBeVisible()
  await expect(calendar.locator(".rdp-month")).toHaveCount(1)

  const dialogBox = await dialog.boundingBox()
  const viewport = page.viewportSize()
  if (!dialogBox || !viewport) throw new Error("Expected a visible mobile sheet")
  expect(Math.abs(dialogBox.y + dialogBox.height - viewport.height)).toBeLessThanOrEqual(1)

  await page.getByRole("button", { name: "Close calendar" }).click()
  await expect(dialog).toBeHidden()

  const moveControl = pickerSlot(page, "move-control")
  const before = await page.getByTestId("committed-range").textContent()
  const box = await moveControl.boundingBox()
  if (!box) throw new Error("Expected a visible mobile move control")
  await moveControl.evaluate((element, bounds) => {
    const control = element as HTMLButtonElement
    const originalSetPointerCapture = control.setPointerCapture.bind(control)
    control.setPointerCapture = () => undefined

    const dispatch = (type: string, clientX: number, buttons: number) => {
      control.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 42,
          pointerType: "touch",
          isPrimary: true,
          button: type === "pointermove" ? -1 : 0,
          buttons,
          clientX,
          clientY: bounds.y + bounds.height / 2,
        }),
      )
    }

    const originX = bounds.x + bounds.width / 2
    dispatch("pointerdown", originX, 1)
    dispatch("pointermove", originX - 60, 1)
    dispatch("pointerup", originX - 60, 0)
    control.setPointerCapture = originalSetPointerCapture
  }, box)
  await expect(page.getByTestId("committed-range")).not.toHaveText(before ?? "")
})

test("the examples page composes charts, viewport modes, and scoped styles", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Examples", exact: true }).click()
  await expect(page).toHaveURL(/\/examples\/?$/)
  await expect(
    page.getByRole("heading", { name: "One picker, many product surfaces." }),
  ).toBeVisible()

  const stacked = page.getByTestId("example-stacked-bars")
  const fixed = page.getByTestId("example-fixed-window")
  const compact = page.getByTestId("example-compact")
  const travel = page.getByTestId("example-travel")

  await expect(stacked).toBeVisible()
  await expect(fixed).toBeAttached()
  await expect(compact).toBeAttached()
  await expect(travel).toBeAttached()

  await expect(stacked.getByTestId("stacked-revenue-chart")).toBeVisible()
  expect(await stacked.locator(".recharts-bar-rectangle").count()).toBeGreaterThan(3)
  await expect(fixed.getByTestId("service-health-chart")).toBeVisible()
  await expect(travel.getByTestId("travel-rate-chart")).toBeVisible()

  await expect(stacked.locator('[data-slot="root"]')).toHaveClass(
    /example-picker-stacked/,
  )
  await expect(fixed.locator('[data-slot="root"]')).toHaveClass(
    /example-picker-contrast/,
  )
  await expect(compact.locator('[data-slot="root"]')).toHaveClass(
    /example-picker-minimal/,
  )
  await expect(travel.locator('[data-slot="root"]')).toHaveClass(
    /example-picker-travel/,
  )

  const sevenDays = stacked.getByRole("button", { name: "7 days", exact: true })
  await sevenDays.click()
  await expect(sevenDays).toHaveAttribute("aria-pressed", "true")
  await expect(stacked.locator('[data-slot="root"]')).toHaveAttribute(
    "data-zoom-level",
    "two-weeks",
  )

  const thirtyDayWindow = fixed.getByRole("radio", { name: "30D" })
  await thirtyDayWindow.click()
  await expect(thirtyDayWindow).toBeChecked()
  await expect(fixed.locator('[data-slot="root"]')).toHaveAttribute(
    "data-zoom-mode",
    "fixed",
  )
  await expect(travel.getByText("14 day trip", { exact: true })).toBeVisible()
})
