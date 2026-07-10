import {
  CalendarRangeIcon,
  GitForkIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { siteHref } from "@/lib/site-path"

export interface SiteHeaderProps {
  currentPage: "home" | "examples"
  theme: "light" | "dark"
  onToggleTheme: () => void
}

const navigation = [
  { href: siteHref("/#demo"), label: "Demo" },
  { href: siteHref("/#features"), label: "Features" },
  { href: siteHref("/#api"), label: "API" },
  { href: siteHref("/examples/"), label: "Examples", page: "examples" },
] as const

export function SiteHeader({
  currentPage,
  theme,
  onToggleTheme,
}: SiteHeaderProps) {
  const mobileDestination =
    currentPage === "home"
      ? { href: siteHref("/examples/"), label: "Examples" }
      : { href: siteHref(), label: "Home" }

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href={siteHref()}
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Datepicker home"
          aria-current={currentPage === "home" ? "page" : undefined}
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <CalendarRangeIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">Datepicker</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            v0.1
          </Badge>
        </a>

        <nav
          className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground aria-[current=page]:text-foreground"
              aria-current={
                "page" in item && item.page === currentPage ? "page" : undefined
              }
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild className="md:hidden">
            <a href={mobileDestination.href}>{mobileDestination.label}</a>
          </Button>
          <Button
            data-testid="theme-toggle"
            variant="ghost"
            size="icon"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/amir-s/datepicker"
              target="_blank"
              rel="noreferrer"
              aria-label="View the project on GitHub"
            >
              <GitForkIcon />
            </a>
          </Button>
        </div>
      </div>
      <Separator />
    </header>
  )
}
