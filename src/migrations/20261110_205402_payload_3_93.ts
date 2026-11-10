import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_video_links_locales_parent_id_idx\` ON \`artists_video_links_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_locales_parent_id_idx\` ON \`artists_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`employees_locales_parent_id_idx\` ON \`employees_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`pages_locales_parent_id_idx\` ON \`pages_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_pages_v_locales_parent_id_idx\` ON \`_pages_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`posts_locales_parent_id_idx\` ON \`posts_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_posts_v_locales_parent_id_idx\` ON \`_posts_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`recordings_locales_parent_id_idx\` ON \`recordings_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_recordings_v_locales_parent_id_idx\` ON \`_recordings_v_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`repertoire_locales_parent_id_idx\` ON \`repertoire_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`search_locales_parent_id_idx\` ON \`search_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`home_page_locales_parent_id_idx\` ON \`home_page_locales\` (\`_parent_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`artists_video_links_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`artists_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`employees_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`pages_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_pages_v_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`posts_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_posts_v_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`recordings_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_recordings_v_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`repertoire_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`search_locales_parent_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`home_page_locales_parent_id_idx\`;`)
}
