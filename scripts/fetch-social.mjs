#!/usr/bin/env node
/**
 * Builds data/social-posts.json — the feed behind the "RCJQ in the media"
 * section on the landing page.
 *
 *   node scripts/fetch-social.mjs
 *
 * Sources, each independent and optional:
 *
 *   Facebook   Graph API /{page-id}/posts        FB_PAGE_ID, FB_PAGE_TOKEN
 *   Instagram  Graph API /{ig-user-id}/media     IG_USER_ID, IG_TOKEN
 *   LinkedIn   REST /rest/posts (if approved)    LINKEDIN_ORG_URN, LINKEDIN_TOKEN
 *              otherwise data/linkedin-posts.json (hand-maintained)
 *
 * Design notes:
 *
 *   - A source that is unconfigured or failing never empties the feed: the
 *     posts already in social-posts.json for that platform are kept, so a
 *     lapsed token degrades to a stale card rather than a blank section.
 *   - Post images are mirrored into data/social-images/. Facebook and
 *     Instagram CDN URLs are signed and expire, so hotlinking them would
 *     silently break every thumbnail after a while.
 *   - Nothing here needs the images or text to be re-encoded: the page
 *     escapes everything at render time.
 *
 * Requires Node 18+ (global fetch).
 */

import { readFile, writeFile, mkdir, readdir, unlink, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const FEED = join(DATA, "social-posts.json");
const LINKEDIN_MANUAL = join(DATA, "linkedin-posts.json");
const IMAGE_DIR = join(DATA, "social-images");
const IMAGE_REL = "data/social-images";

// Graph API version. Meta retires versions after roughly two years, so this is
// overridable — bump GRAPH_VERSION rather than editing the file when it lapses.
const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v23.0"}`;
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || "202505";

const MAX_POSTS = Number(process.env.MAX_POSTS || 12);
const PER_PLATFORM = Number(process.env.PER_PLATFORM || 8);

const PROFILES = {
    facebook: "https://www.facebook.com/RoboCupJuniorQld/",
    instagram: "https://www.instagram.com/robocupjunior.qld/",
    linkedin: "https://www.linkedin.com/company/robocupjuniorqld",
};

const notes = [];
const log = (msg) => console.log(msg);
const warn = (msg) => {
    notes.push(msg);
    console.warn(`  ! ${msg}`);
};

/* ------------------------------------------------------------------ utils */

async function getJson(url, options) {
    const res = await fetch(url, options);
    const body = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch {
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    if (!res.ok || parsed.error) {
        const detail = parsed.error?.message || parsed.message || `HTTP ${res.status}`;
        throw new Error(detail);
    }
    return parsed;
}

/** First line / sentence of a caption, for the card body. */
function tidy(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

function isoDate(value) {
    const d = new Date(value);
    return isNaN(d) ? null : d.toISOString();
}

/* ---------------------------------------------------------------- sources */

async function fetchFacebook() {
    const { FB_PAGE_ID, FB_PAGE_TOKEN } = process.env;
    if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
        warn("Facebook skipped: FB_PAGE_ID / FB_PAGE_TOKEN not set");
        return null;
    }
    const url = `${GRAPH}/${encodeURIComponent(FB_PAGE_ID)}/posts`
        + `?fields=id,message,story,created_time,permalink_url,full_picture`
        + `&limit=${PER_PLATFORM}&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`;

    const { data = [] } = await getJson(url);
    return data
        .map((p) => ({
            platform: "facebook",
            id: p.id,
            url: p.permalink_url || PROFILES.facebook,
            text: tidy(p.message || p.story),
            image: p.full_picture || null,
            date: isoDate(p.created_time),
        }))
        .filter((p) => p.date);
}

async function fetchInstagram() {
    const { IG_USER_ID, IG_TOKEN } = process.env;
    if (!IG_USER_ID || !IG_TOKEN) {
        warn("Instagram skipped: IG_USER_ID / IG_TOKEN not set");
        return null;
    }
    const url = `${GRAPH}/${encodeURIComponent(IG_USER_ID)}/media`
        + `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp`
        + `&limit=${PER_PLATFORM}&access_token=${encodeURIComponent(IG_TOKEN)}`;

    const { data = [] } = await getJson(url);
    return data
        .map((m) => ({
            platform: "instagram",
            id: m.id,
            url: m.permalink || PROFILES.instagram,
            text: tidy(m.caption),
            // Videos expose a still via thumbnail_url; media_url would be the mp4.
            image: m.media_type === "VIDEO" ? m.thumbnail_url || null : m.media_url || null,
            date: isoDate(m.timestamp),
        }))
        .filter((p) => p.date);
}

/**
 * LinkedIn organisation posts.
 *
 * The API needs Marketing Developer Platform approval, so this falls back to
 * data/linkedin-posts.json — a hand-maintained list with the same shape — and
 * LinkedIn cards still appear without any API access.
 */
async function fetchLinkedIn() {
    const { LINKEDIN_ORG_URN, LINKEDIN_TOKEN } = process.env;

    if (LINKEDIN_ORG_URN && LINKEDIN_TOKEN) {
        try {
            const url = "https://api.linkedin.com/rest/posts"
                + `?q=author&author=${encodeURIComponent(LINKEDIN_ORG_URN)}`
                + `&count=${PER_PLATFORM}&sortBy=LAST_MODIFIED`;
            const { elements = [] } = await getJson(url, {
                headers: {
                    Authorization: `Bearer ${LINKEDIN_TOKEN}`,
                    "LinkedIn-Version": LINKEDIN_VERSION,
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            });
            const posts = elements
                .map((el) => ({
                    platform: "linkedin",
                    id: el.id,
                    url: el.id
                        ? `https://www.linkedin.com/feed/update/${el.id}/`
                        : PROFILES.linkedin,
                    text: tidy(el.commentary),
                    image: null, // Images are separate URN lookups; not worth a second call.
                    date: isoDate(el.publishedAt || el.createdAt),
                }))
                .filter((p) => p.date);
            if (posts.length) return posts;
            warn("LinkedIn API returned no posts; falling back to the manual list");
        } catch (err) {
            warn(`LinkedIn API failed (${err.message}); falling back to the manual list`);
        }
    }

    try {
        const manual = JSON.parse(await readFile(LINKEDIN_MANUAL, "utf8"));
        const posts = (Array.isArray(manual) ? manual : manual.posts || [])
            .map((p, i) => ({
                platform: "linkedin",
                id: p.id || p.url || `manual-${i}`,
                url: p.url || PROFILES.linkedin,
                text: tidy(p.text),
                image: p.image || null,
                date: isoDate(p.date),
            }))
            .filter((p) => p.date);
        if (posts.length) {
            log(`  linkedin: ${posts.length} from the manual list`);
            return posts;
        }
        // Empty list: fall through so any previously published posts are kept.
        warn("LinkedIn skipped: no API token and data/linkedin-posts.json is empty");
        return null;
    } catch {
        warn("LinkedIn skipped: no API token and no usable data/linkedin-posts.json");
        return null;
    }
}

/* ----------------------------------------------------------------- images */

/**
 * Mirrors a post image into data/social-images/ and returns its repo-relative
 * path. Signed CDN URLs expire, so the committed copy is what the page uses.
 * Images already mirrored are left alone.
 */
async function mirrorImage(post, existingByKey) {
    if (!post.image) return null;

    const onDisk = async (rel) => {
        try {
            await stat(join(ROOT, rel));
            return true;
        } catch {
            return false;
        }
    };

    // A post carried over from a previous run already points at a mirrored
    // file, and its original CDN URL is long gone — keep it only if the file
    // is really there.
    if (post.image.startsWith(IMAGE_REL)) {
        if (await onDisk(post.image)) return post.image;
        warn(`mirrored image missing for ${post.platform} ${post.id}`);
        return null;
    }

    // Freshly fetched: reuse the existing file rather than re-downloading the
    // same picture daily, but re-fetch if it has gone missing.
    const previous = existingByKey.get(`${post.platform}:${post.id}`);
    if (previous?.image?.startsWith(IMAGE_REL) && (await onDisk(previous.image))) {
        return previous.image;
    }

    // Post ids can be URLs, so hash rather than sanitise: stable across runs
    // and always a sane filename length.
    const safeId = createHash("sha1").update(String(post.id)).digest("hex").slice(0, 12);
    try {
        const res = await fetch(post.image);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get("content-type") || "";
        if (!type.startsWith("image/")) throw new Error(`content-type ${type || "unknown"}`);
        const ext = type.includes("png") ? ".png" : type.includes("webp") ? ".webp" : ".jpg";
        const rel = `${IMAGE_REL}/${post.platform}-${safeId}${ext}`;
        await writeFile(join(ROOT, rel), Buffer.from(await res.arrayBuffer()));
        return rel;
    } catch (err) {
        warn(`image for ${post.platform} ${post.id} not mirrored (${err.message})`);
        return null; // The page renders a branded placeholder instead.
    }
}

/** Deletes mirrored images no longer referenced by the feed. */
async function pruneImages(posts) {
    const keep = new Set(
        posts.map((p) => p.image).filter(Boolean).map((rel) => rel.split("/").pop())
    );
    let removed = 0;
    for (const name of await readdir(IMAGE_DIR)) {
        if (name === ".gitkeep" || !extname(name)) continue;
        if (!keep.has(name)) {
            await unlink(join(IMAGE_DIR, name));
            removed++;
        }
    }
    if (removed) log(`  pruned ${removed} unreferenced image(s)`);
}

/* ------------------------------------------------------------------- main */

await mkdir(IMAGE_DIR, { recursive: true });

let previous = { posts: [] };
try {
    previous = JSON.parse(await readFile(FEED, "utf8"));
} catch {
    log("No existing feed; starting fresh.");
}
const previousPosts = Array.isArray(previous.posts) ? previous.posts : [];
const existingByKey = new Map(previousPosts.map((p) => [`${p.platform}:${p.id}`, p]));

const sources = [
    ["facebook", fetchFacebook],
    ["instagram", fetchInstagram],
    ["linkedin", fetchLinkedIn],
];

const collected = [];
for (const [platform, fetcher] of sources) {
    let posts = null;
    try {
        posts = await fetcher();
    } catch (err) {
        warn(`${platform} failed: ${err.message}`);
    }

    if (posts === null) {
        // Unconfigured or failed: keep whatever this platform had last time.
        const kept = previousPosts.filter((p) => p.platform === platform);
        if (kept.length) log(`  ${platform}: keeping ${kept.length} existing post(s)`);
        collected.push(...kept);
        continue;
    }
    log(`  ${platform}: ${posts.length} post(s)`);
    collected.push(...posts);
}

const ordered = collected
    .filter((p) => p.url && p.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_POSTS);

for (const post of ordered) {
    post.image = await mirrorImage(post, existingByKey);
}
await pruneImages(ordered);

const feed = {
    generated: new Date().toISOString(),
    profiles: PROFILES,
    notes,
    posts: ordered,
};

await writeFile(FEED, `${JSON.stringify(feed, null, 2)}\n`, "utf8");

const counts = ordered.reduce((acc, p) => ({ ...acc, [p.platform]: (acc[p.platform] || 0) + 1 }), {});
log(`Wrote ${FEED}`);
log(`${ordered.length} post(s): ${JSON.stringify(counts)}`);
if (notes.length) log(`${notes.length} note(s) recorded in the feed.`);
