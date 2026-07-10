import { Separator } from "@/components/ui/separator"

export function SiteFooter() {
  return (
    <>
      <Separator />
      <footer className="px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p>Built for React 18/19 · TypeScript · shadcn/ui</p>
          <p>MIT licensed</p>
        </div>
      </footer>
    </>
  )
}
