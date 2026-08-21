# "RCJQ in the media" — for the WordPress site

A drop-in version of the **RCJQ in the media** section from the
[RCJQ landing page](https://margauxmedwards.github.io/robocup-qld/), for a page on
robocupjunior.org.au.

It lists the latest posts filed under the **QLD** category (id `80`) as cards with the
featured image, date, a category pill, and the post excerpt.

## Start here: the QLD page has no HTML block

The QLD page (`/challenge-regions/qld/`, post id `6680`) is built entirely with the
**GoodLayers page builder** that ships with Kingster. Its `post_content` is empty —
the layout lives in post meta — so there is no Gutenberg canvas and no Custom HTML
block to paste into. That's why pasting into the normal editor does nothing.

Use a **custom code element** in the builder instead. Everything below assumes that.

## Which file to use

| File | Use it when | Updates itself? |
| --- | --- | --- |
| `rcjq-in-the-media.html` | **Default** — paste into a custom code element | **Yes** — reads the site's own REST API on page load |
| `rcjq-in-the-media-static.html` | The code element strips `<script>` | No — re-run the generator |
| `rcjq-media-shortcode.php` | Only for someone with plugin or theme-file access | Yes — server-side, no JavaScript |

Both HTML files are self-contained (markup + CSS, no external requests beyond the post
images) and look identical. All CSS is namespaced under `.rcjq-media`, so nothing leaks
into the Kingster theme or picks up styles from it.

## Adding it via the custom code element

1. Edit the page with the GoodLayers builder and add a **custom code / HTML** element
   where the section should sit.
2. Paste the entire contents of `rcjq-in-the-media.html`.
3. Save and view the **front end** — not the builder preview, which won't run the fetch.

If the section header appears but no cards ever load, the `<script>` was stripped: swap
in `rcjq-in-the-media-static.html`, which needs no JavaScript.

Avoid opening the content in a TinyMCE **Visual** tab afterwards — it rewrites `<script>`
and `<style>`. Stay in the code/Text view.

## The PHP shortcode (needs access you may not have)

`rcjq-media-shortcode.php` renders the same section server-side with `WP_Query` — no
JavaScript, no REST request, nothing for an editor to strip. It's the most robust
option, but installing it needs either plugin-upload or theme-file access:

- **As a plugin:** upload to `wp-content/plugins/`, activate *RCJQ in the Media*.
- **In the child theme:** paste the code into `kingster-child/functions.php`.

Then put `[rcjq_media]` in a Text Box or code element. Attributes:

```
[rcjq_media category="87" limit="3" heading="In the press"]
```

Hand this to whoever administers the site if you'd rather not rely on the JavaScript
version. The file's syntax is verified, but it has not been run against a live
WordPress install.

## A no-code alternative worth knowing about

The **SA** and **VIC** challenge-region pages already use the builder's own native
**Blog grid** item to list their region's posts. You could add the same item to the QLD
page, point it at the QLD category, and get a self-updating post grid with no code at
all — styled by the theme rather than to match the landing page. Less control over the
design, but nothing to maintain and no chance of markup being stripped.

## Configuring it

Everything adjustable lives in the `CONFIG` block near the bottom of
`rcjq-in-the-media.html` (constants at the top of `generate-static.mjs`, shortcode
attributes for the PHP):

| Setting | Default | Notes |
| --- | --- | --- |
| `category` | `80` | `80` = QLD. Use `87` to show only posts filed under **In The Media** — that category currently has no posts assigned. |
| `limit` | `6` | Number of cards. |
| `exclude` | `[20692]` | Post IDs to skip. `20692` is *RoboCup Junior Queensland Sumo Competition* — an evergreen challenge page rather than news. |
| `archive` | `/category/qld/` | Target of the "See every Queensland post" link. |

Category IDs come from `/wp-json/wp/v2/categories?per_page=100`.

## Regenerating the derived files

```bash
node wordpress/generate-static.mjs
```

Needs Node 18+. `rcjq-in-the-media.html` is the single hand-edited source of the CSS;
this script rewrites `rcjq-in-the-media-static.html` with the current posts and injects
the same CSS into `rcjq-media-shortcode.php` between its `RCJQ-CSS` markers, so the
three versions can't drift apart. It refuses to write an empty block if the API
returns nothing.

## How the HTML versions get the posts

```
/wp-json/wp/v2/posts?categories=80&per_page=10&orderby=date&order=desc
    &_embed=wp:featuredmedia&_fields=id,date,link,title,excerpt,categories,_links,_embedded
```

Public, read-only, no authentication — the block only ever sees published posts, and
fetches with `credentials: "omit"`. Post titles and excerpts are decoded to plain text
and then re-escaped before being written to the page.
