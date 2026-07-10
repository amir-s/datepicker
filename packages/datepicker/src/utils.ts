import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function composeEventHandlers<EventType extends { defaultPrevented: boolean }>(
  consumerHandler: ((event: EventType) => void) | undefined,
  internalHandler: (event: EventType) => void,
) {
  return (event: EventType) => {
    consumerHandler?.(event)
    if (!event.defaultPrevented) internalHandler(event)
  }
}
