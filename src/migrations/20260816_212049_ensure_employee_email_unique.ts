import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`employees_email_idx\` ON \`employees\` (\`email\`);`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`employees_email_idx\`;`)
}
