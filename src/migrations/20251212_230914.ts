import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`artists_instrument\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artists_instrument_order_idx\` ON \`artists_instrument\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`artists_instrument_parent_idx\` ON \`artists_instrument\` (\`parent_id\`);`)
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
  await db.run(sql`CREATE TABLE \`artists_discography\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`role\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artists_discography_order_idx\` ON \`artists_discography\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`artists_discography_parent_id_idx\` ON \`artists_discography\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artists_discography_locales\` (
  	\`recordings\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists_discography\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`artists_discography_locales_locale_parent_id_unique\` ON \`artists_discography_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artists_youtube_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artists_youtube_links_order_idx\` ON \`artists_youtube_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`artists_youtube_links_parent_id_idx\` ON \`artists_youtube_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artists_youtube_links_locales\` (
  	\`label\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists_youtube_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`artists_youtube_links_locales_locale_parent_id_unique\` ON \`artists_youtube_links_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artists\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`image_id\` integer,
  	\`slug\` text NOT NULL,
  	\`downloads_biography_p_d_f_id\` integer,
  	\`downloads_gallery_z_i_p_id\` integer,
  	\`homepage_u_r_l\` text,
  	\`external_calendar_u_r_l\` text,
  	\`facebook_u_r_l\` text,
  	\`instagram_u_r_l\` text,
  	\`twitter_u_r_l\` text,
  	\`youtube_u_r_l\` text,
  	\`spotify_u_r_l\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`downloads_biography_p_d_f_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`downloads_gallery_z_i_p_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`artists_name_idx\` ON \`artists\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`artists_image_idx\` ON \`artists\` (\`image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`artists_slug_idx\` ON \`artists\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`artists_downloads_downloads_biography_p_d_f_idx\` ON \`artists\` (\`downloads_biography_p_d_f_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_downloads_downloads_gallery_z_i_p_idx\` ON \`artists\` (\`downloads_gallery_z_i_p_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_updated_at_idx\` ON \`artists\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`artists_created_at_idx\` ON \`artists\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`artists_locales\` (
  	\`quote\` text,
  	\`biography\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`artists_locales_locale_parent_id_unique\` ON \`artists_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artists_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`employees_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`employees_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artists_rels_order_idx\` ON \`artists_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_parent_idx\` ON \`artists_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_path_idx\` ON \`artists_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`artists_rels_employees_id_idx\` ON \`artists_rels\` (\`employees_id\`);`)
  await db.run(sql`CREATE TABLE \`employees\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`email\` text NOT NULL,
  	\`phone\` text NOT NULL,
  	\`mobile\` text NOT NULL,
  	\`image_id\` integer,
  	\`order\` numeric NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`employees_image_idx\` ON \`employees\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`employees_updated_at_idx\` ON \`employees\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`employees_created_at_idx\` ON \`employees\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`employees_locales\` (
  	\`title\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`employees_locales_locale_parent_id_unique\` ON \`employees_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`pages_locales\` (
  	\`title\` text,
  	\`slug\` text,
  	\`content\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages_locales\` (\`slug\`,\`_locale\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_locales_locale_parent_id_unique\` ON \`pages_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_snapshot_idx\` ON \`_pages_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_published_locale_idx\` ON \`_pages_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_autosave_idx\` ON \`_pages_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_locales\` (
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_content\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v_locales\` (\`version_slug\`,\`_locale\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`_pages_v_locales_locale_parent_id_unique\` ON \`_pages_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`posts_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`posts_categories_order_idx\` ON \`posts_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`posts_categories_parent_idx\` ON \`posts_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`created_by_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`created_by_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`posts_image_idx\` ON \`posts\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`posts_created_by_idx\` ON \`posts\` (\`created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`posts_updated_at_idx\` ON \`posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`posts_created_at_idx\` ON \`posts\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`posts__status_idx\` ON \`posts\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`posts_locales\` (
  	\`title\` text,
  	\`normalized_title\` text,
  	\`slug\` text,
  	\`content\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`posts_normalized_title_idx\` ON \`posts_locales\` (\`normalized_title\`,\`_locale\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`posts_slug_idx\` ON \`posts_locales\` (\`slug\`,\`_locale\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`posts_locales_locale_parent_id_unique\` ON \`posts_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`posts_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`posts_rels_order_idx\` ON \`posts_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`posts_rels_parent_idx\` ON \`posts_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`posts_rels_path_idx\` ON \`posts_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`posts_rels_artists_id_idx\` ON \`posts_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE TABLE \`_posts_v_version_categories\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_posts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_posts_v_version_categories_order_idx\` ON \`_posts_v_version_categories\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_categories_parent_idx\` ON \`_posts_v_version_categories\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_posts_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_image_id\` integer,
  	\`version_created_by_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_image_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_created_by_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_posts_v_parent_idx\` ON \`_posts_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_image_idx\` ON \`_posts_v\` (\`version_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_created_by_idx\` ON \`_posts_v\` (\`version_created_by_id\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_updated_at_idx\` ON \`_posts_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_created_at_idx\` ON \`_posts_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version__status_idx\` ON \`_posts_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_created_at_idx\` ON \`_posts_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_updated_at_idx\` ON \`_posts_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_snapshot_idx\` ON \`_posts_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_published_locale_idx\` ON \`_posts_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_latest_idx\` ON \`_posts_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_autosave_idx\` ON \`_posts_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_posts_v_locales\` (
  	\`version_title\` text,
  	\`version_normalized_title\` text,
  	\`version_slug\` text,
  	\`version_content\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_posts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_normalized_title_idx\` ON \`_posts_v_locales\` (\`version_normalized_title\`,\`_locale\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_version_version_slug_idx\` ON \`_posts_v_locales\` (\`version_slug\`,\`_locale\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`_posts_v_locales_locale_parent_id_unique\` ON \`_posts_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_posts_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_posts_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_posts_v_rels_order_idx\` ON \`_posts_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_rels_parent_idx\` ON \`_posts_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_rels_path_idx\` ON \`_posts_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_posts_v_rels_artists_id_idx\` ON \`_posts_v_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE TABLE \`recordings_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recordings_roles_order_idx\` ON \`recordings_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`recordings_roles_parent_idx\` ON \`recordings_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recordings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`recording_year\` numeric,
  	\`recording_label\` text,
  	\`catalog_number\` text,
  	\`cover_art_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_art_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`recordings_cover_art_idx\` ON \`recordings\` (\`cover_art_id\`);`)
  await db.run(sql`CREATE INDEX \`recordings_updated_at_idx\` ON \`recordings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`recordings_created_at_idx\` ON \`recordings\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`recordings__status_idx\` ON \`recordings\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`recordings_locales\` (
  	\`title\` text,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`recordings_locales_locale_parent_id_unique\` ON \`recordings_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`recordings_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`recordings_rels_order_idx\` ON \`recordings_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`recordings_rels_parent_idx\` ON \`recordings_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`recordings_rels_path_idx\` ON \`recordings_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`recordings_rels_artists_id_idx\` ON \`recordings_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE TABLE \`_recordings_v_version_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_recordings_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_recordings_v_version_roles_order_idx\` ON \`_recordings_v_version_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_version_roles_parent_idx\` ON \`_recordings_v_version_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_recordings_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_recording_year\` numeric,
  	\`version_recording_label\` text,
  	\`version_catalog_number\` text,
  	\`version_cover_art_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`snapshot\` integer,
  	\`published_locale\` text,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_art_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_recordings_v_parent_idx\` ON \`_recordings_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_version_version_cover_art_idx\` ON \`_recordings_v\` (\`version_cover_art_id\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_version_version_updated_at_idx\` ON \`_recordings_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_version_version_created_at_idx\` ON \`_recordings_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_version_version__status_idx\` ON \`_recordings_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_created_at_idx\` ON \`_recordings_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_updated_at_idx\` ON \`_recordings_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_snapshot_idx\` ON \`_recordings_v\` (\`snapshot\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_published_locale_idx\` ON \`_recordings_v\` (\`published_locale\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_latest_idx\` ON \`_recordings_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_autosave_idx\` ON \`_recordings_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_recordings_v_locales\` (
  	\`version_title\` text,
  	\`version_description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_recordings_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`_recordings_v_locales_locale_parent_id_unique\` ON \`_recordings_v_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_recordings_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_recordings_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_recordings_v_rels_order_idx\` ON \`_recordings_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_rels_parent_idx\` ON \`_recordings_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_rels_path_idx\` ON \`_recordings_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_recordings_v_rels_artists_id_idx\` ON \`_recordings_v_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE TABLE \`repertoire_roles\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`repertoire_roles_order_idx\` ON \`repertoire_roles\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`repertoire_roles_parent_idx\` ON \`repertoire_roles\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`repertoire\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`repertoire_updated_at_idx\` ON \`repertoire\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`repertoire_created_at_idx\` ON \`repertoire\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`repertoire_locales\` (
  	\`title\` text NOT NULL,
  	\`content\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`repertoire_locales_locale_parent_id_unique\` ON \`repertoire_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`repertoire_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`repertoire_rels_order_idx\` ON \`repertoire_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`repertoire_rels_parent_idx\` ON \`repertoire_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`repertoire_rels_path_idx\` ON \`repertoire_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`repertoire_rels_artists_id_idx\` ON \`repertoire_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`role\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`images\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text NOT NULL,
  	\`credit\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumbnail_url\` text,
  	\`sizes_thumbnail_width\` numeric,
  	\`sizes_thumbnail_height\` numeric,
  	\`sizes_thumbnail_mime_type\` text,
  	\`sizes_thumbnail_filesize\` numeric,
  	\`sizes_thumbnail_filename\` text,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text,
  	\`sizes_tablet_url\` text,
  	\`sizes_tablet_width\` numeric,
  	\`sizes_tablet_height\` numeric,
  	\`sizes_tablet_mime_type\` text,
  	\`sizes_tablet_filesize\` numeric,
  	\`sizes_tablet_filename\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`images_updated_at_idx\` ON \`images\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`images_created_at_idx\` ON \`images\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`images_filename_idx\` ON \`images\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`images_sizes_thumbnail_sizes_thumbnail_filename_idx\` ON \`images\` (\`sizes_thumbnail_filename\`);`)
  await db.run(sql`CREATE INDEX \`images_sizes_card_sizes_card_filename_idx\` ON \`images\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`images_sizes_tablet_sizes_tablet_filename_idx\` ON \`images\` (\`sizes_tablet_filename\`);`)
  await db.run(sql`CREATE TABLE \`documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`file_size\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric
  );
  `)
  await db.run(sql`CREATE INDEX \`documents_updated_at_idx\` ON \`documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`documents_created_at_idx\` ON \`documents\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`documents_filename_idx\` ON \`documents\` (\`filename\`);`)
  await db.run(sql`CREATE TABLE \`issues\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text NOT NULL,
  	\`status\` text DEFAULT 'open' NOT NULL,
  	\`reporter_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`reporter_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`issues_reporter_idx\` ON \`issues\` (\`reporter_id\`);`)
  await db.run(sql`CREATE INDEX \`issues_updated_at_idx\` ON \`issues\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`issues_created_at_idx\` ON \`issues\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`search\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`priority\` numeric,
  	\`display_title\` text,
  	\`slug\` text,
  	\`locale\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`search_display_title_idx\` ON \`search\` (\`display_title\`);`)
  await db.run(sql`CREATE INDEX \`search_slug_idx\` ON \`search\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`search_locale_idx\` ON \`search\` (\`locale\`);`)
  await db.run(sql`CREATE INDEX \`search_updated_at_idx\` ON \`search\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`search_created_at_idx\` ON \`search\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`search_locales\` (
  	\`title\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`search\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`search_locales_locale_parent_id_unique\` ON \`search_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`search_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	\`employees_id\` integer,
  	\`pages_id\` integer,
  	\`repertoire_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`search\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`employees_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`repertoire_id\`) REFERENCES \`repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`search_rels_order_idx\` ON \`search_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`search_rels_parent_idx\` ON \`search_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`search_rels_path_idx\` ON \`search_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`search_rels_artists_id_idx\` ON \`search_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE INDEX \`search_rels_employees_id_idx\` ON \`search_rels\` (\`employees_id\`);`)
  await db.run(sql`CREATE INDEX \`search_rels_pages_id_idx\` ON \`search_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`search_rels_repertoire_id_idx\` ON \`search_rels\` (\`repertoire_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`artists_id\` integer,
  	\`employees_id\` integer,
  	\`pages_id\` integer,
  	\`posts_id\` integer,
  	\`recordings_id\` integer,
  	\`repertoire_id\` integer,
  	\`users_id\` integer,
  	\`images_id\` integer,
  	\`documents_id\` integer,
  	\`issues_id\` integer,
  	\`search_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`artists_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`employees_id\`) REFERENCES \`employees\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recordings_id\`) REFERENCES \`recordings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`repertoire_id\`) REFERENCES \`repertoire\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`images_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`documents_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`issues_id\`) REFERENCES \`issues\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`search_id\`) REFERENCES \`search\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_artists_id_idx\` ON \`payload_locked_documents_rels\` (\`artists_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_employees_id_idx\` ON \`payload_locked_documents_rels\` (\`employees_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`posts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recordings_id_idx\` ON \`payload_locked_documents_rels\` (\`recordings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_repertoire_id_idx\` ON \`payload_locked_documents_rels\` (\`repertoire_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_images_id_idx\` ON \`payload_locked_documents_rels\` (\`images_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_documents_id_idx\` ON \`payload_locked_documents_rels\` (\`documents_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_issues_id_idx\` ON \`payload_locked_documents_rels\` (\`issues_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_search_id_idx\` ON \`payload_locked_documents_rels\` (\`search_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`artists_instrument\`;`)
  await db.run(sql`DROP TABLE \`artists_repertoire\`;`)
  await db.run(sql`DROP TABLE \`artists_repertoire_locales\`;`)
  await db.run(sql`DROP TABLE \`artists_discography\`;`)
  await db.run(sql`DROP TABLE \`artists_discography_locales\`;`)
  await db.run(sql`DROP TABLE \`artists_youtube_links\`;`)
  await db.run(sql`DROP TABLE \`artists_youtube_links_locales\`;`)
  await db.run(sql`DROP TABLE \`artists\`;`)
  await db.run(sql`DROP TABLE \`artists_locales\`;`)
  await db.run(sql`DROP TABLE \`artists_rels\`;`)
  await db.run(sql`DROP TABLE \`employees\`;`)
  await db.run(sql`DROP TABLE \`employees_locales\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages_locales\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_locales\`;`)
  await db.run(sql`DROP TABLE \`posts_categories\`;`)
  await db.run(sql`DROP TABLE \`posts\`;`)
  await db.run(sql`DROP TABLE \`posts_locales\`;`)
  await db.run(sql`DROP TABLE \`posts_rels\`;`)
  await db.run(sql`DROP TABLE \`_posts_v_version_categories\`;`)
  await db.run(sql`DROP TABLE \`_posts_v\`;`)
  await db.run(sql`DROP TABLE \`_posts_v_locales\`;`)
  await db.run(sql`DROP TABLE \`_posts_v_rels\`;`)
  await db.run(sql`DROP TABLE \`recordings_roles\`;`)
  await db.run(sql`DROP TABLE \`recordings\`;`)
  await db.run(sql`DROP TABLE \`recordings_locales\`;`)
  await db.run(sql`DROP TABLE \`recordings_rels\`;`)
  await db.run(sql`DROP TABLE \`_recordings_v_version_roles\`;`)
  await db.run(sql`DROP TABLE \`_recordings_v\`;`)
  await db.run(sql`DROP TABLE \`_recordings_v_locales\`;`)
  await db.run(sql`DROP TABLE \`_recordings_v_rels\`;`)
  await db.run(sql`DROP TABLE \`repertoire_roles\`;`)
  await db.run(sql`DROP TABLE \`repertoire\`;`)
  await db.run(sql`DROP TABLE \`repertoire_locales\`;`)
  await db.run(sql`DROP TABLE \`repertoire_rels\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`images\`;`)
  await db.run(sql`DROP TABLE \`documents\`;`)
  await db.run(sql`DROP TABLE \`issues\`;`)
  await db.run(sql`DROP TABLE \`search\`;`)
  await db.run(sql`DROP TABLE \`search_locales\`;`)
  await db.run(sql`DROP TABLE \`search_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
}
