#!/usr/bin/env node
/**
 * Regenerates rcjq-in-the-media-static.html — the no-JavaScript version of the
 * media block, with the current posts baked straight into the markup.
 *
 *   node wordpress/generate-static.mjs
 *
 * Reads the same published feed the live block reads, so both show the same
 * posts, and lifts the CSS from the <style> block in rcjq-in-the-media.html so
 * the two can't drift apart visually. Re-run it whenever you want the static
 * copy refreshed.
 *
 * Requires Node 18+ (uses global fetch).
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = join(HERE, "rcjq-in-the-media.html");
const OUT = join(HERE, "rcjq-in-the-media-static.html");

const BASE = "https://margauxmedwards.github.io/robocup-qld/";
const FEED = `${BASE}data/social-posts.json`;
const LIMIT = 6;

const LABELS = {
    facebook: { label: "Facebook", url: "https://www.facebook.com/RoboCupJuniorQld/" },
    instagram: { label: "Instagram", url: "https://www.instagram.com/robocupjunior.qld/" },
    linkedin: { label: "LinkedIn", url: "https://www.linkedin.com/company/robocupjuniorqld" },
};

const esc = (str) =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

/** Captions run long and end in hashtag blocks; keep the readable part. */
const caption = (text) =>
    String(text || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

const absolute = (path) =>
    !path ? null : /^https?:\/\//i.test(path) ? path : BASE + String(path).replace(/^\//, "");

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

function thumb(post, text) {
    const src = absolute(post.image);
    if (!src) {
        const name = LABELS[post.platform]?.label || "RCJQ";
        return `<span class="rcjq-media__thumb rcjq-media__thumb--empty" aria-hidden="true">${esc(name)}</span>`;
    }
    return `<img class="rcjq-media__thumb" src="${esc(src)}" alt="${esc(text.slice(0, 90) || "RCJQ social post")}" loading="lazy" decoding="async">`;
}

function card(post) {
    const meta = LABELS[post.platform] || { label: "RCJQ" };
    const text = caption(post.text);
    return `        <a class="rcjq-media__card" href="${esc(post.url)}" target="_blank" rel="noopener">
            ${thumb(post, text)}
            <span class="rcjq-media__body">
                <span class="rcjq-media__meta">
                    <span class="rcjq-media__date">${esc(formatDate(post.date))}</span>
                    <span class="rcjq-media__pill rcjq-media__pill--${esc(post.platform)}">${esc(meta.label)}</span>
                </span>${
        text ? `\n                <span class="rcjq-media__excerpt">${esc(text)}</span>` : ""
    }
                <span class="rcjq-media__read">View the post &rarr;</span>
            </span>
        </a>`;
}

const res = await fetch(FEED);
if (!res.ok) throw new Error(`Feed returned HTTP ${res.status}`);

const feed = await res.json();
const posts = (Array.isArray(feed.posts) ? feed.posts : []).slice(0, LIMIT);
if (!posts.length) {
    throw new Error(
        "The feed has no posts yet — set the platform secrets and run the " +
            '"Refresh social feed" workflow before generating the static block.'
    );
}

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
  rcjq-in-the-media.html, which updates itself as new posts are published.
  ============================================================================
-->
<section class="rcjq-media" aria-labelledby="rcjq-media-title">
    <header class="rcjq-media__head">
        <span class="rcjq-media__kicker">Latest updates</span>
        <h2 class="rcjq-media__title" id="rcjq-media-title">RCJQ in the media</h2>
        <p class="rcjq-media__sub">
            Photos, results and announcements as they go up on our Facebook, Instagram and LinkedIn.
        </p>
    </header>

    <div class="rcjq-media__grid">
${posts.map(card).join("\n")}
    </div>

    <a class="rcjq-media__all" href="${LABELS.instagram.url}" target="_blank" rel="noopener">
        Follow @robocupjunior.qld &rarr;
    </a>
</section>

${style[0]}
`;

await writeFile(OUT, html, "utf8");
console.log(`Wrote ${OUT}`);

const counts = posts.reduce((acc, p) => ({ ...acc, [p.platform]: (acc[p.platform] || 0) + 1 }), {});
console.log(`${posts.length} post(s): ${JSON.stringify(counts)}`);
