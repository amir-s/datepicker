import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      insertTypesEntry: true,
      bundleTypes: true,
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: format => (format === "es" ? "index.js" : "index.cjs"),
      cssFileName: "datepicker",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@radix-ui/react-dialog",
        "@radix-ui/react-popover",
        "date-fns",
        "lucide-react",
        "react-day-picker",
      ],
    },
  },
})
