import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`artists_repertoire\`;`)
  await db.run(sql`DROP TABLE \`artists_repertoire_locales\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_artists_rels\` (
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
  await db.run(sql`INSERT INTO \`__new_artists_rels\`("id", "order", "parent_id", "path", "employees_id", "repertoire_id", "posts_id") SELECT "id", "order", "parent_id", "path", "employees_id", NULL, "posts_id" FROM \`artists_rels\`;`)
  await db.run(sql`DROP TABLE \`artists_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_rels\` RENAME TO \`artists_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`artists_rels_order_idx\` ON \`artists_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_parent_idx\` ON \`artists_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_path_idx\` ON \`artists_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_employees_id_idx\` ON \`artists_rels\` (\`employees_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_repertoire_id_idx\` ON \`artists_rels\` (\`repertoire_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_posts_id_idx\` ON \`artists_rels\` (\`posts_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`artists_repertoire\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artists_repertoire_order_idx\` ON \`artists_repertoire\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`artists_repertoire_parent_id_idx\` ON \`artists_repertoire\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artists_repertoire_locales\` (
  	\`title\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists_repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`artists_repertoire_locales_locale_parent_id_unique\` ON \`artists_repertoire_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_artists_rels\` (
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
  await db.run(sql`INSERT INTO \`__new_artists_rels\`("id", "order", "parent_id", "path", "employees_id", "posts_id") SELECT "id", "order", "parent_id", "path", "employees_id", "posts_id" FROM \`artists_rels\`;`)
  await db.run(sql`DROP TABLE \`artists_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_rels\` RENAME TO \`artists_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`artists_rels_order_idx\` ON \`artists_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_parent_idx\` ON \`artists_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_path_idx\` ON \`artists_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_employees_id_idx\` ON \`artists_rels\` (\`employees_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_posts_id_idx\` ON \`artists_rels\` (\`posts_id\`);`)
}
