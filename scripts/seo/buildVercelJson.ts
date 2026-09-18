/**
 * Writes vercel.json from src/config/vercelRedirects.ts.
 *
 * Usage: pnpm seo:vercel
 *
 * Run after editing src/config/vercelRedirects.ts or regenerating
 * src/config/legacyContentRedirects.json (pnpm seo:redirects).
 *
 * @see scripts/seo/buildLegacyRedirects.ts
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { allRedirects, VERCEL_REDIRECT_LIMIT } from '../../src/config/vercelRedirects'

const BASE_CONFIG = {
  buildCommand: 'pnpm run build:ci',
  git: {
    deploymentEnabled: {
      'dependabot/**': false,
    },
  },
}

async function main(): Promise<void> {
  if (allRedirects.length > VERCEL_REDIRECT_LIMIT) {
    throw new Error(`Too many redirects: ${allRedirects.length} exceeds ${VERCEL_REDIRECT_LIMIT}`)
  }

  const config = { ...BASE_CONFIG, redirects: allRedirects }
  await writeFile(join(process.cwd(), 'vercel.json'), `${JSON.stringify(config, null, 2)}\n`)
  console.log(`Wrote vercel.json with ${allRedirects.length} redirects`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
