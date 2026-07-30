# MRAA Website — Instructions for AI edits

This is the **Mizzou Rugby Alumni Association** website: a hand-built static HTML site.
Changes are requested by non-technical board members in plain English (via GitHub issues).
Your job is to make the requested edit safely, matching the existing design exactly.

## Site structure

- Top-level pages: `index.html`, `about.html`, `alumni.html`, `events.html`, `event-detail.html`,
  `news.html`, `news-article.html`, `sponsors.html`, `sponsor-detail.html`, `donate.html`,
  `shop.html`, `team.html`, `history.html`, `contact.html`, `privacy-policy.html`
- `history/` — one page per year, `1968.html` … `2026.html`
- `css/styles.css` — the design system (CSS variables + BEM-style classes)
- `js/main.js` — shared behavior (nav, tabs, filters)
- `assets/` — images; board-uploaded photos live in `assets/uploads/`

## Design conventions (match these exactly)

- Colors/spacing/fonts come from CSS variables in `css/styles.css`
  (`--color-gold: #FDB719`, `--color-black`, `--space-*`, etc.). Never hardcode new colors.
- Cards use the existing pattern: `article.card` > `.card__image`, `.card__body`,
  `.card__tag`, `.card__title`, `.card__meta`, `.card__text`, `.card__footer`.
- Buttons: `btn` with `btn--primary`, `btn--outline-gold`, `btn--sm`.
- Sections: `section` with `section--light` / `section--dark`, content inside `.container`.
- **When adding content, copy the structure of an existing sibling element** (an existing
  news card, event card, sponsor row, etc.) and change only the content.

## Rules

1. **Never modify `css/styles.css` or `js/main.js`** unless the request explicitly asks for a
   style/behavior change. Content requests are HTML-only edits.
2. **Never change the nav or footer** unless explicitly asked; they must stay identical
   across all pages. If asked to change them, update every page that contains them.
3. Keep edits minimal — touch only what the request requires.
4. If a request mentions an uploaded photo, it is in `assets/uploads/` (path given in the issue).
   Use it with a plain `<img>` tag inside the appropriate image container, with descriptive alt text.
5. New news articles: add a card to `news.html` grid (newest first, with a
   `data-category` attribute matching the card tag — the filter pills depend on it)
   AND create the article
   page by copying `news-article.html` structure into a new file `news-<slug>.html`, then
   point the card's links at it.
   **One image per article, everywhere.** Each news article has exactly ONE image — the
   one chosen for the article (its hero). Every preview of that article anywhere on the
   site (news.html grid card, news.html featured block, index.html "Latest" card, related-
   article cards on other article pages) MUST use that same image file. When creating a
   post with an uploaded photo, use it for the article hero AND all its cards. When a
   request changes an article's photo, find every page that links to that article
   (`grep -l "news-<slug>.html" *.html`) and update the image in each place too.
6. New events follow the same pattern on `events.html` / `event-detail.html`.
7. Dates in content are written like "April 10, 2026".
8. If a request is ambiguous, make the most reasonable interpretation and note your
   assumption in the PR description — do not ask questions and stall.
9. If a request would require deleting large amounts of content or restructuring the site,
   make the safest minimal version of it and flag your concern in the PR description.
10. **Never modify anything under `admin/`, `netlify/`, or `.github/`** — these are the
    site's management system, not site content. If a request asks for changes there,
    decline in the PR description and make no changes to those directories.
11. **Verbatim text**: when a request marks text as written by the author (e.g. quoted in
    triple quotes with an "use it EXACTLY as written" note), reproduce it word-for-word —
    no rewording, trimming, or corrections. Blank lines become paragraph breaks. Only
    HTML-escape characters that would break markup.
12. New calendar events go in the Upcoming section of `events.html` (the "Calendar"
    page) as an
    `event-card` (date, title, location, text), keeping cards in date order. If an RSVP
    link is given, point the RSVP button at it with `target="_blank"`; otherwise follow
    the existing card pattern. Keep matches and events in date order, and if a date is
    added or changed, update the month-view grid in the same page's `<details>` block.
13. **Gold year links on `history.html`**: a year in the archive grid turns gold once its
    season page has real content. Whenever you add real content (roster, results, photos,
    stories) to a `history/<year>.html` page — replacing its "This Page Needs Your Help"
    empty state — you MUST also change that year's link on `history.html` from
    `year-link--muted` to `year-link--active`. Never mark a year gold while its page still
    shows the empty state, and if a page's content is ever removed, flip its link back to
    `year-link--muted`. Season pages follow the fall year: e.g. the 1966&ndash;67 season
    lives on `history/1966.html`. Exception: the CURRENT season's year (now 2026) is gold
    and links from the grid straight to `team.html`; its `history/2026.html` page points
    visitors to the Team page until the season is over and gets archived.

## Brand assets & Mizzou licensing rules

- The official club crest lives at `assets/brand/miz-rugby-crest-1600.png` (large) and
  `assets/brand/miz-rugby-crest-400.png` (small); vector source `miz-rugby-crest.pdf`.
  The crest has a WHITE background — use it only on white/light sections, never on the
  black nav/footer without explicit instruction.
- **Mizzou licensing (do not violate):** the club may use the "spirit" tiger head mark
  per https://brand.missouri.edu/brand-visuals/signatures-marks/tiger-marks/ but may
  **NEVER use the athletic tiger head with the oval**. Official club-sports logos:
  https://brand.missouri.edu/apply-the-brand/apparel-merchandise-promo-items/club-sports/
- If a change request asks to add any Mizzou tiger-head logo, use only files already in
  `assets/brand/` — never fetch or recreate marks. If the needed mark isn't there,
  note it in the PR description instead of improvising.

## Workflow requirements

- Work on the branch the action created for you.
- **Always finish by opening a pull request** with `gh pr create`, targeting `main`.
  - PR title: short summary of the change (e.g. "Add news post: Spring Reunion recap").
  - PR body: 1–3 sentences a non-technical board member can understand, listing files changed
    and any assumptions made.
- Commit messages: conventional, e.g. `content: add spring reunion news post`.
