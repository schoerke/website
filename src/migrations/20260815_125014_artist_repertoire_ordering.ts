import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Returns true if the `repertoire_id` column already exists on `artists_rels`.
 * Used to make `up`/`down` idempotent so re-running the migration is a no-op
 * (safe for repeated builds, including Vercel preview deployments).
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_rels') WHERE name = 'repertoire_id'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  // Idempotency guard: if repertoire_id already exists, migration already ran. No-op.
  if (await alreadyApplied(db)) {
    return
  }

  await db.run(sql`DROP TABLE IF EXISTS \`artists_repertoire\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`artists_repertoire_locales\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`employees_id\` integer,
  	\`repertoire_id\` integer,
  	\`posts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`employees_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`repertoire_id\`) REFERENCES \`repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`INSERT OR IGNORE INTO \`__new_artists_rels\`("id", "order", "parent_id", "path", "employees_id", "repertoire_id", "posts_id") SELECT "id", "order", "parent_id", "path", "employees_id", NULL, "posts_id" FROM \`artists_rels\`;`
  )
  await db.run(sql`DROP TABLE IF EXISTS \`artists_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_rels\` RENAME TO \`artists_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_order_idx\` ON \`artists_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_parent_idx\` ON \`artists_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_path_idx\` ON \`artists_rels\` (\`path\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_rels_employees_id_idx\` ON \`artists_rels\` (\`employees_id\`);`
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_rels_repertoire_id_idx\` ON \`artists_rels\` (\`repertoire_id\`);`
  )
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_posts_id_idx\` ON \`artists_rels\` (\`posts_id\`);`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  // Idempotency guard: if repertoire_id does NOT exist, migration already rolled back. No-op.
  if (!(await alreadyApplied(db))) {
    return
  }

  await db.run(sql`CREATE TABLE IF NOT EXISTS \`artists_repertoire\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_repertoire_order_idx\` ON \`artists_repertoire\` (\`_order\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_repertoire_parent_id_idx\` ON \`artists_repertoire\` (\`_parent_id\`);`
  )
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`artists_repertoire_locales\` (
  	\`title\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists_repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_repertoire_locales_locale_parent_id_unique\` ON \`artists_repertoire_locales\` (\`_locale\`,\`_parent_id\`);`
  )
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`employees_id\` integer,
  	\`posts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`employees_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`INSERT OR IGNORE INTO \`__new_artists_rels\`("id", "order", "parent_id", "path", "employees_id", "posts_id") SELECT "id", "order", "parent_id", "path", "employees_id", "posts_id" FROM \`artists_rels\`;`
  )
  await db.run(sql`DROP TABLE IF EXISTS \`artists_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_rels\` RENAME TO \`artists_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_order_idx\` ON \`artists_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_parent_idx\` ON \`artists_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_path_idx\` ON \`artists_rels\` (\`path\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_rels_employees_id_idx\` ON \`artists_rels\` (\`employees_id\`);`
  )
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_rels_posts_id_idx\` ON \`artists_rels\` (\`posts_id\`);`)
}
