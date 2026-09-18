import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * True when the 3.90 upload-tracking column already exists. Guards both
 * directions so re-runs during repeated CI builds are safe (build:ci runs
 * migrations on every build).
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('users') WHERE name = 'reset_password_requested_at'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  // Payload 3.90: forgot-password throttling / lockout reset on the users auth collection.
  await db.run(sql`ALTER TABLE \`users\` ADD \`reset_password_requested_at\` text`)
  // Payload 3.90 storage adapters track the per-upload object folder for client uploads.
  await db.run(sql`ALTER TABLE \`images\` ADD \`_objectkey\` text`)
  await db.run(sql`ALTER TABLE \`documents\` ADD \`_objectkey\` text`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`reset_password_requested_at\``)
  await db.run(sql`ALTER TABLE \`images\` DROP COLUMN \`_objectkey\``)
  await db.run(sql`ALTER TABLE \`documents\` DROP COLUMN \`_objectkey\``)
}
