#!/usr/bin/env node
/**
 * Regenerates the two derived files in this folder:
 *
 *   - rcjq-in-the-media-static.html  the no-JavaScript version of the block,
 *                                    with the current posts baked into markup
 *   - rcjq-media-shortcode.php       gets the shared CSS injected between its
 *                                    RCJQ-CSS markers
 *
 *   node wordpress/generate-static.mjs
 *
 * rcjq-in-the-media.html is the single hand-edited source of the CSS; both
 * outputs above take their styling from its <style> block, so the three
 * versions of this section can't drift apart.
 *
 * Requires Node 18+ (uses global fetch).
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = join(HERE, "rcjq-in-the-media.html");
const OUT = join(HERE, "rcjq-in-the-media-static.html");
const PHP = join(HERE, "rcjq-media-shortcode.php");

const SITE = "https://www.robocupjunior.org.au";
const CATEGORY = 80; // QLD
const LIMIT = 6;
const EXCLUDE = [20692]; // "RoboCup Junior Queensland Sumo Competition"
const ARCHIVE = "/category/qld/";

const PILLS = [
    [88, "Event", "event"],
    [89, "Workshop", "workshop"],
    [86, "News", "news"],
    [90, "Resources", "resource"],
    [2, "News", "news"],
];

const esc = (str) =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

/** Rendered WP HTML -> plain text (tags dropped, entities decoded). */
function plain(html) {
    const named = {
        amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        hellip: "…", ldquo: "“", rdquo: "”", lsquo: "‘",
        rsquo: "’", ndash: "–", mdash: "—",
    };
    // Entities are decoded *before* tags are stripped: some excerpts carry
    // double-encoded markup (&lt;b&gt;) that would otherwise show up literally.
    return String(html || "")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in named ? named[n.toLowerCase()] : m))
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "…")
        .trim();
}

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

function pillFor(categories = []) {
    const hit = PILLS.find(([id]) => categories.includes(id));
    if (!hit) return '<span class="rcjq-media__pill">Update</span>';
    return `<span class="rcjq-media__pill rcjq-media__pill--${hit[2]}">${hit[1]}</span>`;
}

function thumbFor(post, title) {
    const media = post._embedded?.["wp:featuredmedia"]?.[0];
    const sizes = media?.media_details?.sizes;
    const src =
        sizes?.medium_large?.source_url ||
        sizes?.medium?.source_url ||
        sizes?.thumbnail?.source_url ||
        media?.source_url;

    if (!src) {
        return '<span class="rcjq-media__thumb rcjq-media__thumb--empty" aria-hidden="true">RCJQ</span>';
    }
    return `<img class="rcjq-media__thumb" src="${esc(src)}" alt="${esc(media?.alt_text || title)}" loading="lazy" decoding="async">`;
}

function card(post) {
    const title = plain(post.title?.rendered) || "Untitled post";
    const excerpt = plain(post.excerpt?.rendered);
    return `        <a class="rcjq-media__card" href="${esc(post.link)}">
            ${thumbFor(post, title)}
            <span class="rcjq-media__body">
                <span class="rcjq-media__meta">
                    <span class="rcjq-media__date">${esc(formatDate(post.date))}</span>
                    ${pillFor(post.categories)}
                </span>
                <span class="rcjq-media__name">${esc(title)}</span>${
        excerpt ? `\n                <span class="rcjq-media__excerpt">${esc(excerpt)}</span>` : ""
    }
                <span class="rcjq-media__read">Read the post &rarr;</span>
            </span>
        </a>`;
}

const url =
    `${SITE}/wp-json/wp/v2/posts?categories=${CATEGORY}` +
    `&per_page=${LIMIT + EXCLUDE.length + 3}&orderby=date&order=desc` +
    `&_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,categories,_links,_embedded`;

const res = await fetch(url);
if (!res.ok) throw new Error(`REST API returned HTTP ${res.status}`);

const posts = (await res.json()).filter((p) => !EXCLUDE.includes(p.id)).slice(0, LIMIT);
if (!posts.length) throw new Error("REST API returned no posts — refusing to write an empty block");

// Single source of truth for the styling: reuse the live block's <style> tag.
const live = await readFile(LIVE, "utf8");
const style = live.match(/<style>[\s\S]*?<\/style>/);
if (!style) throw new Error(`No <style> block found in ${LIVE}`);

const stamp = new Date().toISOString().slice(0, 10);

const html = `<!--
  ============================================================================
  RCJQ IN THE MEDIA — static WordPress block (no JavaScript)
  ============================================================================
  Generated ${stamp} by wordpress/generate-static.mjs — do not hand-edit.
  Re-run that script to refresh the posts below.

  Use this version if your editor strips <script> tags. Otherwise prefer
  rcjq-in-the-media.html, which updates itself.
  ============================================================================
-->
<section class="rcjq-media" aria-labelledby="rcjq-media-title">
    <header class="rcjq-media__head">
        <span class="rcjq-media__kicker">Latest updates</span>
        <h2 class="rcjq-media__title" id="rcjq-media-title">RCJQ in the media</h2>
        <p class="rcjq-media__sub">
            Announcements, information packs and season news from RoboCup Junior Queensland.
        </p>
    </header>

    <div class="rcjq-media__grid">
${posts.map(card).join("\n")}
    </div>

    <a class="rcjq-media__all" href="${ARCHIVE}">
        See every Queensland post &rarr;
    </a>
</section>

${style[0]}
`;

await writeFile(OUT, html, "utf8");
console.log(`Wrote ${OUT}`);

// The PHP shortcode carries the same CSS inline, so it stays a single portable
// file. Inject it between the markers rather than keeping a second copy.
const START = "/* RCJQ-CSS-START — generated, do not hand-edit */";
const END = "/* RCJQ-CSS-END */";
const php = await readFile(PHP, "utf8");
const markers = new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`);
if (!markers.test(php)) throw new Error(`CSS markers not found in ${PHP}`);

const inner = style[0].replace(/^<style>\n?/, "").replace(/\n?<\/style>$/, "");
// A nowdoc ends at a line starting with its identifier — CSS never does, but
// guard anyway so generated output can't break PHP parsing.
if (/^CSS\b/m.test(inner)) throw new Error("CSS body would terminate the PHP nowdoc");

await writeFile(PHP, php.replace(markers, `${START}\n${inner}\n${END}`), "utf8");
console.log(`Wrote ${PHP}`);

console.log(`${posts.length} posts, newest: ${plain(posts[0].title.rendered)}`);

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
