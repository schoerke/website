import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * True when the posts.published_date column already exists. Guards both directions
 * so re-runs during repeated CI builds are safe (build:ci runs migrations on every build).
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(sql`SELECT COUNT(*) AS c FROM pragma_table_info('posts') WHERE name = 'published_date'`)
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  await db.run(sql`ALTER TABLE posts ADD COLUMN published_date text`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS posts_published_date_idx ON posts (published_date)`)
  // Backfill existing posts so ordering/display is unchanged until an editor overrides.
  await db.run(sql`UPDATE posts SET published_date = created_at WHERE published_date IS NULL`)

  await db.run(sql`ALTER TABLE _posts_v ADD COLUMN version_published_date text`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS _posts_v_version_version_published_date_idx ON _posts_v (version_published_date)`
  )
  // Backfill the CURRENT version row per post (latest = 1) so the drafts-path site sort reads a
  // non-NULL date for every post. Historical rows (latest = 0) stay NULL on purpose: restoring a
  // legacy version then delivers value=null, and the setPublishedDate hook's isRestoringVersion
  // branch preserves the current backdate instead of resetting it. Backfilling historical rows
  // would make legacy restores stamp the old era's createdAt and drop a current backdate.
  await db.run(
    sql`UPDATE _posts_v SET version_published_date = (SELECT p.published_date FROM posts p WHERE p.id = _posts_v.parent_id) WHERE _posts_v.latest = 1 AND version_published_date IS NULL`
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  // SQLite rejects DROP COLUMN on an indexed column — drop the indexes first.
  await db.run(sql`DROP INDEX IF EXISTS posts_published_date_idx`)
  await db.run(sql`ALTER TABLE posts DROP COLUMN published_date`)

  await db.run(sql`DROP INDEX IF EXISTS _posts_v_version_version_published_date_idx`)
  await db.run(sql`ALTER TABLE _posts_v DROP COLUMN version_published_date`)
}
