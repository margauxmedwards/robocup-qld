# "RCJQ in the media" — WordPress block

A drop-in version of the **RCJQ in the media** section from the
[RCJQ landing page](https://margauxmedwards.github.io/robocup-qld/), ready to paste
into a page on robocupjunior.org.au.

It lists the latest posts filed under the **QLD** category (id `80`) as cards with the
featured image, date, a category pill, and the post excerpt.

## Which file to use

| File | Use it when | Updates itself? |
| --- | --- | --- |
| `rcjq-in-the-media.html` | Default choice | **Yes** — reads the site's own REST API on page load |
| `rcjq-in-the-media-static.html` | Your editor strips `<script>` tags | No — re-run the generator |

Both files are self-contained (markup + CSS, no external requests beyond the post
images) and look identical. All CSS is namespaced under `.rcjq-media`, so nothing
leaks into the Kingster theme or picks up styles from it.

## How to add it to a page

**Block editor (Gutenberg)**

1. Edit the page → add a **Custom HTML** block.
2. Paste the entire contents of the file.
3. Preview the page (the block editor's inline preview won't run the fetch).

**Kingster / GoodLayers page builder**

1. Add a **Text Box** element where you want the section.
2. Switch the editor to **Text** (HTML) mode — *not* Visual.
3. Paste the entire contents of the file, then save and view the page.

If the Visual tab is opened afterwards it can rewrite the markup, so stay on the
Text tab when editing. If the section renders but stays empty, use the static file.

> Pasting `<script>` requires the `unfiltered_html` capability — fine for an
> Administrator on a single site.

## Configuring it

Everything adjustable lives in the `CONFIG` block near the bottom of
`rcjq-in-the-media.html` (and as the constants at the top of `generate-static.mjs`):

| Setting | Default | Notes |
| --- | --- | --- |
| `category` | `80` | `80` = QLD. Use `87` to show only posts filed under **In The Media** — that category currently has no posts assigned. |
| `limit` | `6` | Number of cards. |
| `exclude` | `[20692]` | Post IDs to skip. `20692` is *RoboCup Junior Queensland Sumo Competition* — an evergreen challenge page rather than news. |
| `archive` | `/category/qld/` | Target of the "See every Queensland post" link. |

Category IDs come from `/wp-json/wp/v2/categories?per_page=100`.

## Refreshing the static version

```bash
node wordpress/generate-static.mjs
```

Needs Node 18+. It fetches the current posts and rewrites
`rcjq-in-the-media-static.html`, reusing the `<style>` block from
`rcjq-in-the-media.html` so the two never drift apart. It refuses to write an
empty block if the API returns nothing.

## How it gets the posts

```
/wp-json/wp/v2/posts?categories=80&per_page=10&orderby=date&order=desc
    &_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,categories,_links,_embedded
```

Public, read-only, no authentication — the block only ever sees published posts, and
fetches with `credentials: "omit"`. Post titles and excerpts are decoded to plain text
and then re-escaped before being written to the page.
