import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Returns true when the localized quote source column exists. Both directions
 * are safe to rerun during repeated builds.
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_locales') WHERE name = 'quote_source'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  await db.run(sql`ALTER TABLE artists_locales ADD COLUMN quote_source text`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  await db.run(sql`ALTER TABLE artists_locales DROP COLUMN quote_source`)
}
