# "RCJQ in the media" — for the WordPress site

A drop-in version of the **RCJQ in the media** section from the
[RCJQ landing page](https://margauxmedwards.github.io/robocup-qld/), for a page on
robocupjunior.org.au.

It shows the latest posts from the RCJQ **Facebook**, **Instagram** and **LinkedIn**
accounts as cards with the post image, date, a platform badge, and the caption.

## Where the posts come from

All three platforms put post content behind a login wall, so none of them can be read
from a browser. The landing-page repo runs a daily GitHub Action that fetches them and
publishes a feed:

```
https://margauxmedwards.github.io/robocup-qld/data/social-posts.json
```

This block reads that feed, so it updates itself and needs no tokens of its own. The
feed is served with `Access-Control-Allow-Origin: *`, so reading it from
robocupjunior.org.au works. See the repo root `README.md` for the workflow and the
secrets it needs.

**Until those secrets are configured the feed is empty**, and the block falls back to
links to the three profiles rather than looking broken.

## The QLD page has no HTML block

The QLD page (`/challenge-regions/qld/`, post id `6680`) is built entirely with the
**GoodLayers page builder** that ships with Kingster. Its `post_content` is empty — the
layout lives in post meta — so there is no Gutenberg canvas and no Custom HTML block to
paste into. That's why pasting into the normal editor does nothing.

Use the builder's **custom code element** instead:

1. Edit the page with the GoodLayers builder and add a **custom code / HTML** element
   where the section should sit.
2. Paste the entire contents of `rcjq-in-the-media.html`.
3. Save and view the **front end** — not the builder preview, which won't run the fetch.

Avoid opening the content in a TinyMCE **Visual** tab afterwards — it rewrites `<script>`
and `<style>`. Stay in the code view.

## Configuring it

The `CONFIG` block near the bottom of `rcjq-in-the-media.html`:

| Setting | Default | Notes |
| --- | --- | --- |
| `base` | the Pages URL | Feed location, and what image paths resolve against. Keep the trailing slash. |
| `feed` | `data/social-posts.json` | Path to the feed under `base`. |
| `limit` | `6` | Number of cards. |
| `platforms` | all three | Trim to e.g. `["instagram"]` to show one platform. |

## If the code element strips `<script>`

Run the generator to bake the current posts into a static, JavaScript-free copy:

```bash
node wordpress/generate-static.mjs
```

It writes `rcjq-in-the-media-static.html`, reading the same feed and reusing the
`<style>` block from `rcjq-in-the-media.html` so the two look identical. It refuses to
run while the feed is still empty, so there is no static file in the repo yet — generate
it once the workflow has published some posts.

## Removed

`rcjq-media-shortcode.php` rendered this section from **WordPress** posts via `WP_Query`.
The section now shows social posts instead, so it no longer applies — recover it from git
history if it's ever useful. A PHP version reading the social feed would need
`wp_remote_get` plus a transient cache, and installing it would still need the plugin or
theme-file access that isn't available.
