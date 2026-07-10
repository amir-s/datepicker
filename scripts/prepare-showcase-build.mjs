import { copyFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const distDirectory = resolve(repositoryDirectory, "apps/showcase/dist")
const entryFile = resolve(distDirectory, "index.html")
const examplesDirectory = resolve(distDirectory, "examples")

await mkdir(examplesDirectory, { recursive: true })
await copyFile(entryFile, resolve(examplesDirectory, "index.html"))
