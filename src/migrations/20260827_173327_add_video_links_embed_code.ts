import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Returns true if the `artists_video_links` table already has an `embed_code` column.
 * Used to make `up`/`down` idempotent so re-running the migration is a no-op
 * (safe for repeated builds, including Vercel preview deployments via `build:ci`).
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_video_links') WHERE name = 'embed_code'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  // Recreate artists_video_links with the new nullable embed_code column.
  // Table-recreate (not ALTER ADD COLUMN) keeps the ON DELETE CASCADE FK intact
  // (ALTER would create a NO ACTION FK — see docs/memory/migrations.md).
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists_video_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	\`embed_code\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_artists_video_links\`("_order", "_parent_id", "id", "url") SELECT "_order", "_parent_id", "id", "url" FROM \`artists_video_links\`;`)
  await db.run(sql`DROP TABLE \`artists_video_links\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_video_links\` RENAME TO \`artists_video_links\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_video_links_order_idx\` ON \`artists_video_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_video_links_parent_id_idx\` ON \`artists_video_links\` (\`_parent_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists_video_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_artists_video_links\`("_order", "_parent_id", "id", "url") SELECT "_order", "_parent_id", "id", "url" FROM \`artists_video_links\`;`)
  await db.run(sql`DROP TABLE \`artists_video_links\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_video_links\` RENAME TO \`artists_video_links\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_video_links_order_idx\` ON \`artists_video_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_video_links_parent_id_idx\` ON \`artists_video_links\` (\`_parent_id\`);`)
}