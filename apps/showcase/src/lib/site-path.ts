const baseUrl = import.meta.env.BASE_URL
const basePath = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "")

/** Build an internal showcase URL that remains inside Vite's deployment base. */
export function siteHref(path = "/"): string {
  const relativePath = path.replace(/^\/+/, "")
  return relativePath ? `${baseUrl}${relativePath}` : baseUrl
}

/** Return the current route after removing the configured deployment base. */
export function siteRoute(pathname: string): string {
  const relativePath =
    basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
      ? pathname.slice(basePath.length)
      : pathname
  const normalizedPath = relativePath.replace(/\/+$/, "") || "/"
  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`
}
