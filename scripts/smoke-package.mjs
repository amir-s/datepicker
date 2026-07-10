/* global console, process */

import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageDirectory = join(rootDirectory, "packages", "datepicker")
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const tscBin = join(rootDirectory, "node_modules", "typescript", "bin", "tsc")
const viteBin = join(rootDirectory, "node_modules", "vite", "bin", "vite.js")
const requiredBuildFiles = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/datepicker.css",
]
const requiredTarballFiles = [
  ...requiredBuildFiles,
  "LICENSE",
  "README.md",
  "package.json",
]
const reactVersions = ["18.3.1", "19.2.7"]

function run(command, args, options = {}) {
  const { capture = false, ...execOptions } = options
  return execFileSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_fund: "false",
      npm_config_audit: "false",
      npm_config_update_notifier: "false",
    },
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    ...execOptions,
  })
}

function assertBuildExists() {
  const missing = requiredBuildFiles.filter(
    file => !existsSync(join(packageDirectory, file)),
  )

  if (missing.length > 0) {
    throw new Error(
      `Package build is incomplete (${missing.join(", ")}). Run \`npm run build --workspace @amir-s/datepicker\` first.`,
    )
  }
}

async function createConsumer(directory, reactVersion, tarballPath) {
  const reactMajor = reactVersion.split(".")[0]
  const fixtureDirectory = join(directory, `react-${reactMajor}`)
  const sourceDirectory = join(fixtureDirectory, "src")
  await mkdir(sourceDirectory, { recursive: true })

  await writeFile(
    join(fixtureDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: `datepicker-react-${reactMajor}-consumer`,
        private: true,
        version: "0.0.0",
        type: "module",
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(fixtureDirectory, "index.html"),
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Datepicker smoke test</title></head><body><div id="root"></div><script type="module" src="/src/main.ts"></script></body></html>\n',
  )
  await writeFile(
    join(fixtureDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          jsx: "react-jsx",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: "ES2022",
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(sourceDirectory, "main.ts"),
    `import * as React from "react"
import { createRoot } from "react-dom/client"
import {
  TimelineDateRangePicker,
  type TimelineDateRangePickerProps,
} from "@amir-s/datepicker"
import "@amir-s/datepicker/styles.css"

const today = new Date(2026, 6, 10)
const props = {
  ariaLabel: "Package smoke test",
  defaultValue: {
    from: new Date(2026, 6, 1),
    to: new Date(2026, 6, 10),
  },
  today,
} satisfies TimelineDateRangePickerProps

const container = document.getElementById("root")
if (!container) throw new Error("Missing application root")

createRoot(container).render(
  React.createElement(TimelineDateRangePicker, props),
)
`,
  )
  await writeFile(
    join(sourceDirectory, "assets.d.ts"),
    'declare module "*.css" {}\n',
  )
  await writeFile(
    join(fixtureDirectory, "verify-cjs.cjs"),
    `const library = require("@amir-s/datepicker")

if (typeof library.TimelineDateRangePicker !== "function") {
  throw new TypeError("CommonJS export TimelineDateRangePicker is missing")
}
`,
  )

  run(
    npmCommand,
    [
      "install",
      "--ignore-scripts",
      "--save-exact",
      `react@${reactVersion}`,
      `react-dom@${reactVersion}`,
      `@types/react@^${reactMajor}.0.0`,
      `@types/react-dom@^${reactMajor}.0.0`,
      tarballPath,
    ],
    { cwd: fixtureDirectory },
  )
  run(process.execPath, [tscBin, "--project", "tsconfig.json"], {
    cwd: fixtureDirectory,
  })
  run(process.execPath, [viteBin, "build"], { cwd: fixtureDirectory })
  run(process.execPath, [join(fixtureDirectory, "verify-cjs.cjs")], {
    cwd: fixtureDirectory,
  })

  const builtHtml = await readFile(join(fixtureDirectory, "dist", "index.html"), "utf8")
  if (!builtHtml.includes("Datepicker smoke test")) {
    throw new Error(`React ${reactVersion} consumer did not produce the expected app`)
  }
}

async function main() {
  assertBuildExists()

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "datepicker-package-"))
  const packDirectory = join(temporaryDirectory, "pack")
  await mkdir(packDirectory)

  try {
    const packOutput = run(
      npmCommand,
      ["pack", "--json", "--pack-destination", packDirectory],
      { cwd: packageDirectory, capture: true },
    )
    const [packResult] = JSON.parse(packOutput)
    if (!packResult?.filename || !Array.isArray(packResult.files)) {
      throw new Error("npm pack did not return package metadata")
    }

    const packedFiles = new Set(packResult.files.map(file => file.path))
    const missing = requiredTarballFiles.filter(file => !packedFiles.has(file))
    if (missing.length > 0) {
      throw new Error(`Tarball is missing publish files: ${missing.join(", ")}`)
    }

    const tarballPath = join(packDirectory, packResult.filename)
    for (const reactVersion of reactVersions) {
      await createConsumer(temporaryDirectory, reactVersion, tarballPath)
    }

    console.log(
      `\nPackage smoke test passed for React ${reactVersions.join(" and React ")}.`,
    )
  } finally {
    if (process.env.KEEP_SMOKE_FIXTURES === "1") {
      console.log(`Kept smoke fixtures at ${temporaryDirectory}`)
    } else {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  }
}

await main()
