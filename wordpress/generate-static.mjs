#!/usr/bin/env node
/**
 * Regenerates rcjq-in-the-media-static.html — the no-JavaScript version of the
 * media block, with the current posts baked straight into the markup.
 *
 *   node wordpress/generate-static.mjs
 *
 * The CSS is not duplicated here: it is lifted from the <style> block in
 * rcjq-in-the-media.html, so the two variants always look identical.
 * Re-run this whenever a new QLD post is published.
 *
 * Requires Node 18+ (uses global fetch).
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = join(HERE, "rcjq-in-the-media.html");
const OUT = join(HERE, "rcjq-in-the-media-static.html");

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
console.log(`${posts.length} posts, newest: ${plain(posts[0].title.rendered)}`);
