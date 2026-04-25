/**
 * Posts Dataset Review Server
 *
 * Serves a browser-based side-by-side DE/EN viewer for posts-dataset.json.
 * Use this to verify matched pairs are correct before running the import.
 *
 * Usage:
 *   pnpm tsx scripts/wordpress/reviewPostsDataset.ts
 *   Then open http://localhost:3456
 */

import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATASET_PATH = path.join(__dirname, 'data', 'posts-dataset.json')
const PORT = 3456

// ── YouTube embed conversion (runs server-side before sending to browser) ──

function extractYouTubeId(url: string): string | null {
  // Decode &amp; before parsing so ?app=desktop&amp;v=xxx and &amp;list= etc. work
  const decoded = url.replace(/&amp;/g, '&')
  const watchMatch = decoded.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = decoded.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  return null
}

function youTubeEmbed(id: string): string {
  return (
    `<div style="position:relative;padding-bottom:56.25%;height:0;margin:12px 0">` +
    `<iframe src="https://www.youtube.com/embed/${id}" ` +
    `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" ` +
    `allowfullscreen></iframe></div>`
  )
}

function spotifyEmbed(url: string): string {
  // Strip leftover [/embed] cruft, decode &amp;amp; entities, strip query params
  const clean = url
    .replace(/\[\/embed\].*$/, '')
    .replace(/&amp;amp;.*$/, '')
    .replace(/&amp;.*$/, '')
    .replace(/\?.*$/, '')
    // Strip intl-xx/ locale prefix: open.spotify.com/intl-de/album -> open.spotify.com/album
    .replace(/open\.spotify\.com\/intl-[a-z]+\//, 'open.spotify.com/')
  const embedUrl = clean.replace(/open\.spotify\.com\/(?!embed)/, 'open.spotify.com/embed/')
  return `<iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
}

function processContent(html: string): string {
  if (!html) return html

  // Unwrap [embed]URL[/embed] shortcodes to bare URL (including malformed ones without closing bracket)
  html = html.replace(/\[embed\](https?:\/\/[^\[\s]+?)(?:\[\/embed\]|$)/gi, '$1')

  // Strip any remaining [/embed] remnants
  html = html.replace(/\[\/embed\]/gi, '')

  // YouTube URL matcher (reused below)
  const ytPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s<"[\]]*|youtu\.be\/[^\s<"[\]]*)/

  // Convert YouTube URLs wrapped in <p> or <p class=...> tags
  html = html.replace(new RegExp(`<p[^>]*>(${ytPattern.source})<\/p>`, 'gi'), (_, url) => {
    const id = extractYouTubeId(url)
    return id ? `<p>${youTubeEmbed(id)}</p>` : `<p>${url}</p>`
  })

  // Convert bare YouTube URLs on their own line (not inside a tag)
  html = html.replace(new RegExp(`(^|\\n)(${ytPattern.source})(\\n|$)`, 'gm'), (_, pre, url, post) => {
    const id = extractYouTubeId(url)
    return id ? `${pre}${youTubeEmbed(id)}${post}` : `${pre}${url}${post}`
  })

  // Spotify URL matcher
  const spPattern = /https?:\/\/open\.spotify\.com\/[^\s<"[\]]+/

  // Convert Spotify URLs in <p> tags
  html = html.replace(new RegExp(`<p[^>]*>(${spPattern.source})<\/p>`, 'gi'), (_, url) => {
    return `<p>${spotifyEmbed(url)}</p>`
  })

  // Convert bare Spotify URLs on their own line
  html = html.replace(new RegExp(`(^|\\n)(${spPattern.source})(\\n|$)`, 'gm'), (_, pre, url, post) => {
    return `${pre}${spotifyEmbed(url)}${post}`
  })

  // Replicate htmlToLexical rendering so the viewer matches the imported result:
  if (!html.includes('<p')) {
    // No <p> tags: \n\n = paragraph break, \n = linebreak
    html = html
      .split('\n\n')
      .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }
  // Has <p> tags: already paragraph-structured, leave as-is

  return html
}

interface PostLocale {
  title: string
  contentHtml: string
  slug: string
  source: string
}

interface PostEntry {
  wpSlug: string
  publishedAt: string
  category: string
  artists: string[]
  imagePath: string | null
  en: PostLocale
  de: PostLocale
}

const rawDataset: PostEntry[] = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'))

// Pre-process all content server-side
const dataset = rawDataset.map((entry) => ({
  ...entry,
  en: { ...entry.en, contentHtml: processContent(entry.en.contentHtml) },
  de: { ...entry.de, contentHtml: processContent(entry.de.contentHtml) },
}))

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Posts Dataset Review</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f0f13; color: #e0e0e0; min-height: 100vh; }

  /* Header */
  .header { background: #1a1a2e; border-bottom: 1px solid #2a2a3e; padding: 12px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; }
  .header h1 { font-size: 1rem; font-weight: 600; color: #fff; white-space: nowrap; }
  .counter { font-size: 0.85rem; color: #888; white-space: nowrap; }

  /* Filters */
  .filters { display: flex; gap: 8px; flex-wrap: wrap; }
  .filter-btn { padding: 4px 12px; border-radius: 20px; border: 1px solid #333; background: transparent; color: #aaa; cursor: pointer; font-size: 0.8rem; transition: all 0.15s; }
  .filter-btn:hover { border-color: #666; color: #ddd; }
  .filter-btn.active { color: #fff; }
  .filter-btn.f-all.active     { background: #2a2a3e; border-color: #555; }
  .filter-btn.f-matched.active { background: #0d3d1a; border-color: #2d7a3a; color: #6dca7a; }
  .filter-btn.f-fuzzy.active   { background: #3d2e00; border-color: #7a6a00; color: #d4b800; }
  .filter-btn.f-auto.active    { background: #3d0d0d; border-color: #7a2a2a; color: #e07070; }

  /* Nav */
  .nav { display: flex; gap: 8px; margin-left: auto; align-items: center; }
  .nav button { padding: 5px 14px; border-radius: 6px; border: 1px solid #333; background: #1e1e2e; color: #ccc; cursor: pointer; font-size: 0.85rem; transition: background 0.1s; }
  .nav button:hover:not(:disabled) { background: #2a2a3e; color: #fff; }
  .nav button:disabled { opacity: 0.35; cursor: default; }
  .nav input { width: 56px; padding: 4px 8px; border-radius: 6px; border: 1px solid #333; background: #1e1e2e; color: #ccc; font-size: 0.85rem; text-align: center; }

  /* Main */
  .main { padding: 20px 24px; max-width: 1400px; margin: 0 auto; }

  /* Meta bar */
  .meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  .badge { padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.03em; }
  .badge.matched       { background: #0d3d1a; border: 1px solid #2d7a3a; color: #6dca7a; }
  .badge.fuzzy-match   { background: #3d2e00; border: 1px solid #7a6a00; color: #d4b800; }
  .badge.auto-translate{ background: #3d0d0d; border: 1px solid #7a2a2a; color: #e07070; }
  .badge.original      { background: #0d2a3d; border: 1px solid #1a5a7a; color: #6ab4e0; }
  .badge.cat           { background: #1e1e2e; border: 1px solid #3a3a5a; color: #9090c0; }
  .meta-date  { font-size: 0.8rem; color: #666; }
  .artists    { font-size: 0.8rem; color: #888; }

  /* Columns */
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 800px) { .columns { grid-template-columns: 1fr; } }

  .col { background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 8px; overflow: hidden; }
  .col-header { padding: 10px 16px; background: #13132a; border-bottom: 1px solid #2a2a3e; display: flex; align-items: center; gap: 8px; }
  .col-lang  { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666; }
  .col-title { font-size: 1rem; font-weight: 600; color: #ddd; line-height: 1.3; }
  .col-slug  { font-size: 0.7rem; color: #555; font-family: monospace; margin-top: 2px; }
  .col-body  { padding: 16px; font-size: 0.88rem; line-height: 1.6; color: #b0b0c0; overflow-y: auto; max-height: 65vh; }
  .col-body p         { margin-bottom: 10px; }
  .col-body strong, .col-body b { color: #ddd; }
  .col-body em, .col-body i     { color: #c0c0d8; }
  .col-body a         { color: #6ab4e0; }
  .empty-note { color: #555; font-style: italic; }

  /* No results */
  .no-results { text-align: center; padding: 80px 24px; color: #555; font-size: 1rem; }
</style>
</head>
<body>

<div class="header">
  <h1>Posts Dataset Review</h1>
  <span class="counter" id="counter"></span>
  <div class="filters">
    <button class="filter-btn f-all active" onclick="setFilter('all')">All</button>
    <button class="filter-btn f-matched" onclick="setFilter('matched')">Exact</button>
    <button class="filter-btn f-fuzzy" onclick="setFilter('fuzzy-match')">Fuzzy</button>
    <button class="filter-btn f-auto" onclick="setFilter('auto-translate')">Auto-translate</button>
  </div>
  <div class="nav">
    <button id="btn-prev" onclick="go(-1)">← Prev</button>
    <input id="jump-input" type="number" min="1" onchange="jumpTo(this.value)" title="Jump to entry">
    <button id="btn-next" onclick="go(1)">Next →</button>
  </div>
</div>

<div class="main" id="main"></div>

<script>
const ALL = ${JSON.stringify(dataset)};
let filter = 'all';
let filtered = ALL;
let idx = 0;

function matchType(entry) {
  const enSrc = entry.en.source;
  const deSrc = entry.de.source;
  if (enSrc === 'auto-translate' || deSrc === 'auto-translate') return 'auto-translate';
  if (enSrc === 'fuzzy-match'    || deSrc === 'fuzzy-match')    return 'fuzzy-match';
  return 'matched';
}

function setFilter(f) {
  filter = f;
  idx = 0;
  filtered = f === 'all' ? ALL : ALL.filter(e => matchType(e) === f);
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  const cls = f === 'fuzzy-match' ? 'fuzzy' : f === 'auto-translate' ? 'auto' : f;
  document.querySelector('.f-' + cls).classList.add('active');
  render();
}

function go(delta) {
  idx = Math.max(0, Math.min(filtered.length - 1, idx + delta));
  render();
}

function jumpTo(val) {
  const n = parseInt(val, 10);
  if (!isNaN(n)) idx = Math.max(0, Math.min(filtered.length - 1, n - 1));
  render();
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft')  go(-1);
  if (e.key === 'ArrowRight') go(1);
});

function srcBadge(src) {
  const labels = { original: 'DE original', matched: 'exact match', 'fuzzy-match': 'fuzzy match', 'auto-translate': 'auto-translate' };
  return '<span class="badge ' + src + '">' + (labels[src] || src) + '</span>';
}

function render() {
  const main      = document.getElementById('main');
  const counter   = document.getElementById('counter');
  const jumpInput = document.getElementById('jump-input');

  if (filtered.length === 0) {
    main.innerHTML = '<div class="no-results">No entries match this filter.</div>';
    counter.textContent = '0 entries';
    jumpInput.value = '';
    document.getElementById('btn-prev').disabled = true;
    document.getElementById('btn-next').disabled = true;
    return;
  }

  const e    = filtered[idx];
  const type = matchType(e);
  const date = new Date(e.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  counter.textContent = (idx + 1) + ' / ' + filtered.length;
  jumpInput.value = idx + 1;
  jumpInput.max   = filtered.length;
  document.getElementById('btn-prev').disabled = idx === 0;
  document.getElementById('btn-next').disabled = idx === filtered.length - 1;

  const artistsHtml = e.artists.length
    ? '<span class="artists">🎵 ' + e.artists.join(', ') + '</span>'
    : '';

  function col(locale, data) {
    return (
      '<div class="col">' +
        '<div class="col-header">' +
          '<span class="col-lang">' + locale + '</span>' +
          srcBadge(data.source) +
        '</div>' +
        '<div style="padding:12px 16px 0">' +
          '<div class="col-title">' + (data.title || '<em style="color:#555">no title</em>') + '</div>' +
          '<div class="col-slug">/' + data.slug + '</div>' +
        '</div>' +
        '<div class="col-body">' +
          (data.contentHtml || '<span class="empty-note">No content — needs translation</span>') +
        '</div>' +
      '</div>'
    );
  }

  main.innerHTML =
    '<div class="meta">' +
      '<span class="badge ' + type + '">' + type + '</span>' +
      '<span class="badge cat">' + e.category + '</span>' +
      '<span class="meta-date">' + date + '</span>' +
      artistsHtml +
    '</div>' +
    '<div class="columns">' +
      col('DE', e.de) +
      col('EN', e.en) +
    '</div>';
}

render();
</script>
</body>
</html>`

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Review server running at http://localhost:${PORT}`)
  console.log(`   ${dataset.length} entries loaded — YouTube links converted to embeds`)
  console.log(`   Use ← → arrow keys to navigate, or filter by match type`)
  console.log(`   Press Ctrl+C to stop`)
})
