import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Returns true if the `artists_video_links_locales` table already exists.
 * Used to make `up`/`down` idempotent so re-running the migration is a no-op
 * (safe for repeated builds, including Vercel preview deployments via `build:ci`).
 *
 * SCHEMA-ONLY: this migration moves no data. The existing non-localized `label`
 * values are backfilled into the localized de + en locales via the Payload Local
 * API ("Copy existing labels to de + en; editors edit later"). The mapping was
 * pre-saved to data/dumps/video-labels.tsv before this migration drops `label`.
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='artists_video_links_locales'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  // Idempotency guard: if the locales table already exists, migration already ran. No-op.
  if (await alreadyApplied(db)) {
    return
  }

  // Create the localized-locales table (per Payload's generated schema).
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`artists_video_links_locales\` (
  	\`label\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists_video_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_video_links_locales_locale_parent_id_unique\` ON \`artists_video_links_locales\` (\`_locale\`,\`_parent_id\`);`
  )

  // Drop the now-migrated non-localized `label` column. It is a plain text column with no FK,
  // so ALTER DROP COLUMN is allowed; url is untouched.
  await db.run(sql`ALTER TABLE \`artists_video_links\` DROP COLUMN \`label\`;`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  // Idempotency guard: if the locales table does NOT exist, migration already rolled back. No-op.
  if (!(await alreadyApplied(db))) {
    return
  }

  // Re-add the non-localized label column (empty; localized values are lost on rollback of a
  // schema-only migration — accepted, editors re-enter).
  await db.run(sql`ALTER TABLE \`artists_video_links\` ADD \`label\` text NOT NULL DEFAULT '';`)

  // Drop the locales table.
  await db.run(sql`DROP TABLE IF EXISTS \`artists_video_links_locales\`;`)
}
