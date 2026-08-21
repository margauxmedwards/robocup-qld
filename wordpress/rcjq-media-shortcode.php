<?php
/**
 * Plugin Name: RCJQ in the Media
 * Description: Renders the "RCJQ in the media" section via the [rcjq_media] shortcode — a grid of the latest Queensland posts. Rendered server-side, so it works on pages built with the GoodLayers/Kingster page builder where an HTML block isn't available.
 * Version:     1.0.0
 * Author:      RoboCup Junior Queensland
 * License:     GPL-2.0-or-later
 *
 * Two ways to install:
 *
 *   1. As a plugin (recommended) — upload this file to wp-content/plugins/
 *      and activate "RCJQ in the Media" from Plugins.
 *   2. In the child theme — copy everything below the closing of this comment
 *      into wp-content/themes/kingster-child/functions.php.
 *
 * Then add a Text Box item where you want the section and put [rcjq_media]
 * in it. Attributes are documented on rcjq_media_render() below.
 *
 * Unlike the HTML block versions, this needs no JavaScript and no REST
 * request: the posts are pulled straight from the database with WP_Query.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Category id => array( pill label, pill CSS suffix ). First match wins.
 */
function rcjq_media_pills() {
	return array(
		88 => array( 'Event', 'event' ),
		89 => array( 'Workshop', 'workshop' ),
		86 => array( 'News', 'news' ),
		90 => array( 'Resources', 'resource' ),
		2  => array( 'News', 'news' ),
	);
}

/**
 * The pill markup for the current post in the loop.
 */
function rcjq_media_pill( $post_id ) {
	foreach ( rcjq_media_pills() as $term_id => $pill ) {
		if ( has_category( $term_id, $post_id ) ) {
			return '<span class="rcjq-media__pill rcjq-media__pill--' . esc_attr( $pill[1] ) . '">'
				. esc_html( $pill[0] ) . '</span>';
		}
	}
	return '<span class="rcjq-media__pill">Update</span>';
}

/**
 * Excerpt as plain text.
 *
 * Entities are decoded before tags are stripped: some excerpts carry
 * double-encoded markup (&lt;b&gt;) that would otherwise show up literally.
 */
function rcjq_media_excerpt( $post_id ) {
	$text = html_entity_decode( get_the_excerpt( $post_id ), ENT_QUOTES, 'UTF-8' );
	$text = wp_strip_all_tags( $text );
	$text = preg_replace( '/\s*\[(?:\x{2026}|\.\.\.)\]\s*$/u', '', $text );
	return wp_trim_words( $text, 32, '&hellip;' );
}

/**
 * The <style> block, printed once per page.
 *
 * The CSS between the markers is generated from the <style> block in
 * rcjq-in-the-media.html by generate-static.mjs — edit it there, not here,
 * so every version of this section stays in sync.
 */
function rcjq_media_styles() {
	static $printed = false;
	if ( $printed ) {
		return '';
	}
	$printed = true;

	$css = <<<'CSS'
/* RCJQ-CSS-START — generated, do not hand-edit */

/* All selectors are namespaced under .rcjq-media so nothing here can leak into
   the Kingster theme's own styles (or pick up styles from it). */
.rcjq-media {
    --rcjq-navy: #192f59;
    --rcjq-navy-deep: #101f3d;
    --rcjq-green: #9dbd38;
    --rcjq-green-bright: #b5d84a;
    --rcjq-green-dark: #5b7413;
    --rcjq-ink: #24292f;
    --rcjq-muted: #5b6470;
    --rcjq-line: #e4e8ee;

    box-sizing: border-box;
    max-width: 1080px;
    margin: 0 auto;
    padding: 8px 0 4px;
    font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
    color: var(--rcjq-ink);
    text-align: left;
}

.rcjq-media *,
.rcjq-media *::before,
.rcjq-media *::after { box-sizing: border-box; }

/* ---------- Heading ---------- */
.rcjq-media__head { margin-bottom: 20px; }

.rcjq-media__kicker {
    display: block;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--rcjq-green-dark);
    margin-bottom: 6px;
}

.rcjq-media h2.rcjq-media__title {
    margin: 0 0 8px;
    padding: 0;
    font-size: clamp(1.4rem, 3.4vw, 1.9rem);
    font-weight: 800;
    line-height: 1.2;
    color: var(--rcjq-navy);
    text-transform: none;
}

.rcjq-media p.rcjq-media__sub {
    margin: 0;
    max-width: 620px;
    font-size: 0.98rem;
    line-height: 1.6;
    color: var(--rcjq-muted);
}

/* ---------- Grid ---------- */
.rcjq-media__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
    gap: 18px;
}

/* ---------- Card ---------- */
.rcjq-media a.rcjq-media__card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid var(--rcjq-line);
    border-radius: 14px;
    overflow: hidden;
    text-decoration: none !important;
    color: var(--rcjq-ink);
    box-shadow: 0 2px 10px rgba(16, 31, 61, 0.06);
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.rcjq-media a.rcjq-media__card:hover,
.rcjq-media a.rcjq-media__card:focus-visible {
    transform: translateY(-3px);
    border-color: var(--rcjq-green);
    box-shadow: 0 10px 24px rgba(16, 31, 61, 0.14);
}

.rcjq-media__thumb {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    margin: 0;
    background: rgba(25, 47, 89, 0.07);
}

/* Shown when a post has no featured image. */
.rcjq-media__thumb--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--rcjq-navy), var(--rcjq-navy-deep));
    color: var(--rcjq-green-bright);
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 3px;
}

.rcjq-media__body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    padding: 15px 17px 17px;
}

.rcjq-media__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.rcjq-media__date {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--rcjq-muted);
}

.rcjq-media__pill {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(25, 47, 89, 0.08);
    color: var(--rcjq-navy);
}

.rcjq-media__pill--event { background: #fdeee4; color: #c0561b; }
.rcjq-media__pill--workshop { background: #e7f0fb; color: #1a5fa8; }
.rcjq-media__pill--news { background: rgba(157, 189, 56, 0.2); color: var(--rcjq-green-dark); }
.rcjq-media__pill--resource { background: #f0ecfb; color: #5b3fa8; }

.rcjq-media__name {
    display: block;
    margin: 0 0 7px;
    font-size: 1.02rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--rcjq-navy);
}

.rcjq-media__excerpt {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--rcjq-muted);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.rcjq-media__read {
    margin-top: 12px;
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--rcjq-green-dark);
}

/* ---------- Loading / fallback note ---------- */
.rcjq-media p.rcjq-media__note {
    grid-column: 1 / -1;
    margin: 0;
    padding: 22px 18px;
    text-align: center;
    font-size: 0.95rem;
    color: var(--rcjq-muted);
    background: rgba(25, 47, 89, 0.03);
    border: 1px dashed var(--rcjq-line);
    border-radius: 14px;
}

.rcjq-media p.rcjq-media__note a {
    color: var(--rcjq-green-dark);
    font-weight: 700;
}

/* ---------- Footer link ---------- */
.rcjq-media a.rcjq-media__all {
    display: inline-block;
    margin-top: 18px;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--rcjq-green-dark);
    text-decoration: none !important;
}

.rcjq-media a.rcjq-media__all:hover { text-decoration: underline !important; }

@media (max-width: 480px) {
    .rcjq-media__grid { grid-template-columns: 1fr; gap: 14px; }
}
/* RCJQ-CSS-END */
CSS;

	return '<style>' . $css . '</style>';
}

/**
 * [rcjq_media] — the media grid.
 *
 * Attributes:
 *   category  Category id to pull from. Default 80 (QLD); 87 is "In The Media".
 *   limit     Number of cards. Default 6.
 *   exclude   Comma-separated post ids to skip. Default 20692 (the evergreen
 *             Sumo challenge page, which isn't really news).
 *   archive   Target of the "see every post" link. Default /category/qld/.
 *   heading   Section heading. Pass heading="" to omit the whole header.
 *   kicker    Small label above the heading.
 *   intro     Sentence under the heading.
 *
 * Example: [rcjq_media category="87" limit="3" heading="In the press"]
 */
function rcjq_media_render( $atts ) {
	$atts = shortcode_atts(
		array(
			'category' => 80,
			'limit'    => 6,
			'exclude'  => '20692',
			'archive'  => '/category/qld/',
			'heading'  => 'RCJQ in the media',
			'kicker'   => 'Latest updates',
			'intro'    => 'Announcements, information packs and season news from RoboCup Junior Queensland.',
		),
		$atts,
		'rcjq_media'
	);

	$exclude = array_filter( array_map( 'absint', explode( ',', $atts['exclude'] ) ) );

	$query = new WP_Query(
		array(
			'post_type'           => 'post',
			'post_status'         => 'publish',
			'cat'                 => absint( $atts['category'] ),
			'posts_per_page'      => absint( $atts['limit'] ),
			'post__not_in'        => $exclude,
			'orderby'             => 'date',
			'order'               => 'DESC',
			'ignore_sticky_posts' => true,
			'no_found_rows'       => true,
		)
	);

	ob_start();
	// Static CSS, no user input.
	echo rcjq_media_styles();
	?>
	<section class="rcjq-media">
		<?php if ( '' !== $atts['heading'] ) : ?>
			<header class="rcjq-media__head">
				<?php if ( '' !== $atts['kicker'] ) : ?>
					<span class="rcjq-media__kicker"><?php echo esc_html( $atts['kicker'] ); ?></span>
				<?php endif; ?>
				<h2 class="rcjq-media__title"><?php echo esc_html( $atts['heading'] ); ?></h2>
				<?php if ( '' !== $atts['intro'] ) : ?>
					<p class="rcjq-media__sub"><?php echo esc_html( $atts['intro'] ); ?></p>
				<?php endif; ?>
			</header>
		<?php endif; ?>

		<div class="rcjq-media__grid">
			<?php if ( ! $query->have_posts() ) : ?>
				<p class="rcjq-media__note">No posts published yet — check back soon.</p>
			<?php endif; ?>

			<?php
			while ( $query->have_posts() ) :
				$query->the_post();
				$excerpt = rcjq_media_excerpt( get_the_ID() );
				?>
				<a class="rcjq-media__card" href="<?php echo esc_url( get_permalink() ); ?>">
					<?php
					if ( has_post_thumbnail() ) {
						echo get_the_post_thumbnail(
							null,
							'medium_large',
							array(
								'class'    => 'rcjq-media__thumb',
								'loading'  => 'lazy',
								'decoding' => 'async',
							)
						);
					} else {
						echo '<span class="rcjq-media__thumb rcjq-media__thumb--empty" aria-hidden="true">RCJQ</span>';
					}
					?>
					<span class="rcjq-media__body">
						<span class="rcjq-media__meta">
							<span class="rcjq-media__date"><?php echo esc_html( get_the_date( 'j M Y' ) ); ?></span>
							<?php
							// Already escaped inside rcjq_media_pill().
							echo rcjq_media_pill( get_the_ID() );
							?>
						</span>
						<span class="rcjq-media__name"><?php echo esc_html( get_the_title() ); ?></span>
						<?php if ( '' !== $excerpt ) : ?>
							<span class="rcjq-media__excerpt"><?php echo esc_html( $excerpt ); ?></span>
						<?php endif; ?>
						<span class="rcjq-media__read">Read the post &rarr;</span>
					</span>
				</a>
				<?php
			endwhile;
			wp_reset_postdata();
			?>
		</div>

		<?php if ( '' !== $atts['archive'] ) : ?>
			<a class="rcjq-media__all" href="<?php echo esc_url( $atts['archive'] ); ?>">
				See every Queensland post &rarr;
			</a>
		<?php endif; ?>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'rcjq_media', 'rcjq_media_render' );
