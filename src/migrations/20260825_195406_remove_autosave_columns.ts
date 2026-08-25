import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Returns true if ANY of the three version tables still has an `autosave` column.
 * Used to make `up`/`down` idempotent so re-running the migration is a no-op
 * (safe for repeated builds, including Vercel preview deployments).
 */
async function autosaveColumnsRemain(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT
        (SELECT COUNT(*) FROM pragma_table_info('_pages_v') WHERE name = 'autosave') +
        (SELECT COUNT(*) FROM pragma_table_info('_posts_v') WHERE name = 'autosave') +
        (SELECT COUNT(*) FROM pragma_table_info('_recordings_v') WHERE name = 'autosave') AS c`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  if (!(await autosaveColumnsRemain(db))) {
    return
  }

  await db.run(sql`DROP INDEX IF EXISTS \`_pages_v_autosave_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_posts_v_autosave_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_recordings_v_autosave_idx\`;`)

  // SQLite ALTER TABLE DROP COLUMN fails if the column is referenced; autosave
  // is a plain INTEGER timestamp column on version tables, safe to drop. Wrapped
  // in try/never needed — guarded by the idempotency check above.
  await db.run(sql`ALTER TABLE \`_pages_v\` DROP COLUMN \`autosave\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`autosave\`;`)
  await db.run(sql`ALTER TABLE \`_recordings_v\` DROP COLUMN \`autosave\`;`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  if (await autosaveColumnsRemain(db)) {
    return
  }

  await db.run(sql`ALTER TABLE \`_pages_v\` ADD \`autosave\` integer;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_pages_v_autosave_idx\` ON \`_pages_v\` (\`autosave\`);`)
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`autosave\` integer;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_posts_v_autosave_idx\` ON \`_posts_v\` (\`autosave\`);`)
  await db.run(sql`ALTER TABLE \`_recordings_v\` ADD \`autosave\` integer;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_recordings_v_autosave_idx\` ON \`_recordings_v\` (\`autosave\`);`)
}