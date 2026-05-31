import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const isDryRun = process.argv.includes('--dry-run')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const packageJsonPath = path.join(rootDir, 'package.json')
const packageLockPath = path.join(rootDir, 'package-lock.json')

function bumpPatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)

  if (!match) {
    throw new Error(`Versao invalida para bump patch: ${version}`)
  }

  const [, major, minor, patch] = match

  return `${major}.${minor}.${Number(patch) + 1}`
}

function updatePackageLockVersion(packageLock, nextVersion) {
  packageLock.version = nextVersion

  if (packageLock.packages?.['']) {
    packageLock.packages[''].version = nextVersion
  }
}

async function main() {
  const [packageJsonRaw, packageLockRaw] = await Promise.all([
    readFile(packageJsonPath, 'utf8'),
    readFile(packageLockPath, 'utf8'),
  ])

  const packageJson = JSON.parse(packageJsonRaw)
  const packageLock = JSON.parse(packageLockRaw)

  const currentVersion = packageJson.version
  const nextVersion = bumpPatchVersion(currentVersion)

  packageJson.version = nextVersion
  updatePackageLockVersion(packageLock, nextVersion)

  if (!isDryRun) {
    await Promise.all([
      writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`),
      writeFile(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`),
    ])
  }

  process.stdout.write(
    `${isDryRun ? '[dry-run] ' : ''}Version bump: ${currentVersion} -> ${nextVersion}\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
