import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * True when the posts.unlisted column already exists. Guards both directions so
 * re-runs during repeated CI builds are safe (build:ci runs migrations on every build).
 *
 * Note: the AudioEmbed block's fileUrl field has no schema impact — AudioEmbed is a
 * lexical (rich text) block, so its field values are stored as JSON inside the rich
 * text column rather than in a dedicated relational table/column. Only posts.unlisted
 * requires a schema migration.
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(sql`SELECT COUNT(*) AS c FROM pragma_table_info('posts') WHERE name = 'unlisted'`)
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  await db.run(sql`ALTER TABLE \`posts\` ADD \`unlisted\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`version_unlisted\` integer DEFAULT false;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  await db.run(sql`ALTER TABLE \`posts\` DROP COLUMN \`unlisted\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`version_unlisted\`;`)
}
