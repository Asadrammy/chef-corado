const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const prismaClientDir = path.join(root, "node_modules", ".prisma", "client")
const generatedClientEntry = path.join(prismaClientDir, "index.js")
const projectSchema = path.join(root, "prisma", "schema.prisma")
const generatedSchema = path.join(prismaClientDir, "schema.prisma")
const queryEngine = path.join(prismaClientDir, "query_engine-windows.dll.node")
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js")

const wait = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const removeTempEngines = () => {
  if (!fs.existsSync(prismaClientDir)) return

  for (const entry of fs.readdirSync(prismaClientDir)) {
    if (entry.startsWith("query_engine-windows.dll.node.tmp")) {
      fs.rmSync(path.join(prismaClientDir, entry), { force: true })
    }
  }
}

const hasExistingClient = () => fs.existsSync(generatedClientEntry) && fs.existsSync(queryEngine)

const readNormalized = (filePath) => fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n")

const getModelFieldSignatures = (schema, modelName) => {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`))
  if (!match) return null

  return new Set(
    match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
      .map((line) => {
        const [fieldName, fieldType] = line.split(/\s+/)
        return `${fieldName}:${fieldType}`
      }),
  )
}

const hasCurrentGeneratedRequestModel = () => {
  if (!fs.existsSync(projectSchema) || !fs.existsSync(generatedSchema)) return false

  const projectRequestFields = getModelFieldSignatures(readNormalized(projectSchema), "Request")
  const generatedRequestFields = getModelFieldSignatures(readNormalized(generatedSchema), "Request")

  if (!projectRequestFields || !generatedRequestFields) return false

  for (const field of projectRequestFields) {
    if (!generatedRequestFields.has(field)) return false
  }

  return true
}

const isWindowsPrismaEngineRenameLock = (output) =>
  process.platform === "win32" &&
  /EPERM/i.test(output) &&
  /rename/i.test(output) &&
  /query_engine-windows\.dll\.node/i.test(output)

const isSpawnPermissionLock = (output) =>
  process.platform === "win32" && /spawnSync/i.test(output) && /EPERM/i.test(output)

const runPrismaGenerate = () => {
  return spawnSync(process.execPath, [prismaCli, "generate"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    shell: false,
  })
}

removeTempEngines()

let lastOutput = ""

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const result = runPrismaGenerate()
  lastOutput = `${result.stdout || ""}${result.stderr || ""}${result.error ? result.error.message : ""}`
  const isLockError = isWindowsPrismaEngineRenameLock(lastOutput) || isSpawnPermissionLock(lastOutput)

  if (result.status === 0) {
    process.stdout.write(result.stdout || "")
    process.stderr.write(result.stderr || "")
    process.exit(0)
  }

  if (!isLockError) {
    process.stdout.write(result.stdout || "")
    process.stderr.write(result.stderr || "")
    process.exit(result.status || 1)
  }

  removeTempEngines()
  wait(500 * attempt)
}

if (
  (isWindowsPrismaEngineRenameLock(lastOutput) || isSpawnPermissionLock(lastOutput)) &&
  hasExistingClient() &&
  hasCurrentGeneratedRequestModel()
) {
  console.warn(
    "Prisma generate hit a Windows process/file lock. " +
      "An existing generated Prisma Client is present, so npm install can continue. " +
      "Stop running Node/Next/Prisma processes and run npm run prisma:generate if the schema changed.",
  )
  removeTempEngines()
  process.exit(0)
}

if ((isWindowsPrismaEngineRenameLock(lastOutput) || isSpawnPermissionLock(lastOutput)) && hasExistingClient()) {
  console.error(
    "Prisma generate hit a Windows process/file lock, but the generated Prisma Client schema is stale. " +
      "Stop running Node/Next/Prisma processes and run npm run prisma:generate before starting the app.",
  )
  process.stdout.write(lastOutput)
  process.exit(1)
}

process.stdout.write(lastOutput)
process.exit(1)
