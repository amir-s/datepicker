"use client"

import * as Dialog from "@radix-ui/react-dialog"
import * as Popover from "@radix-ui/react-popover"
import { XIcon } from "lucide-react"
import * as React from "react"
import {
  DayPicker,
  type DateRange as DayPickerDateRange,
  type DayPickerProps,
  type Matcher,
} from "react-day-picker"

import type { DateRange } from "./types"
import { cn } from "./utils"
import { useMediaQuery } from "./use-media-query"

interface CalendarPickerProps {
  trigger: React.ReactElement
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: DateRange
  draft: DayPickerDateRange | undefined
  onSelect: (range: DayPickerDateRange | undefined, triggerDate: Date) => void
  today: Date
  minDate?: Date
  maxDate?: Date
  minDays?: number
  maxDays?: number
  className?: string
  calendarClassName?: string
  calendarProps?: Omit<DayPickerProps, "mode" | "selected" | "onSelect">
}

function CalendarSurface({
  selected,
  draft,
  onSelect,
  today,
  minDate,
  maxDate,
  minDays,
  maxDays,
  calendarClassName,
  calendarProps,
}: Omit<CalendarPickerProps, "trigger" | "open" | "onOpenChange" | "className">) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  const disabled: Matcher[] = []
  if (minDate) disabled.push({ before: minDate })
  if (maxDate) disabled.push({ after: maxDate })
  if (calendarProps?.disabled) {
    if (Array.isArray(calendarProps.disabled)) disabled.push(...calendarProps.disabled)
    else disabled.push(calendarProps.disabled)
  }

  return (
    <DayPicker
      {...calendarProps}
      data-slot="calendar"
      mode="range"
      today={today}
      selected={draft ?? { from: selected.from, to: selected.to }}
      onSelect={onSelect}
      startMonth={minDate}
      endMonth={maxDate}
      numberOfMonths={calendarProps?.numberOfMonths ?? (isMobile ? 1 : 2)}
      defaultMonth={calendarProps?.defaultMonth ?? selected.from}
      disabled={disabled}
      min={minDays ? Math.max(0, minDays - 1) : (calendarProps as { min?: number } | undefined)?.min}
      max={maxDays ? Math.max(0, maxDays - 1) : (calendarProps as { max?: number } | undefined)?.max}
      showOutsideDays={calendarProps?.showOutsideDays ?? true}
      className={cn("tdp-calendar", calendarProps?.className, calendarClassName)}
    />
  )
}

export function CalendarPicker(props: CalendarPickerProps) {
  const isMobile = useMediaQuery("(max-width: 639px)")

  if (isMobile) {
    return (
      <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
        <Dialog.Trigger asChild>{props.trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="tdp-dialog-overlay" data-slot="calendar-overlay" />
          <Dialog.Content className={cn("tdp-dialog-content", props.className)} data-slot="calendar-content">
            <div className="tdp-dialog-header">
              <div>
                <Dialog.Title className="tdp-dialog-title">Choose a date range</Dialog.Title>
                <Dialog.Description className="tdp-dialog-description">
                  Select a start date and an end date.
                </Dialog.Description>
              </div>
              <Dialog.Close className="tdp-icon-button" aria-label="Close calendar">
                <XIcon aria-hidden="true" />
              </Dialog.Close>
            </div>
            <CalendarSurface {...props} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Popover.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Popover.Trigger asChild>{props.trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={cn("tdp-popover-content", props.className)}
          data-slot="calendar-content"
          align="start"
          sideOffset={8}
          collisionPadding={16}
        >
          <CalendarSurface {...props} />
          <Popover.Arrow className="tdp-popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
