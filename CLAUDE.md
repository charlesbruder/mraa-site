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
5. New news articles: add a card to `news.html` grid (newest first) AND create the article
   page by copying `news-article.html` structure into a new file `news-<slug>.html`, then
   point the card's links at it.
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
12. New calendar events go in the Upcoming Events section of `events.html` as an
    `event-card` (date, title, location, text), keeping cards in date order. If an RSVP
    link is given, point the RSVP button at it with `target="_blank"`; otherwise follow
    the existing card pattern.

## Workflow requirements

- Work on the branch the action created for you.
- **Always finish by opening a pull request** with `gh pr create`, targeting `main`.
  - PR title: short summary of the change (e.g. "Add news post: Spring Reunion recap").
  - PR body: 1–3 sentences a non-technical board member can understand, listing files changed
    and any assumptions made.
- Commit messages: conventional, e.g. `content: add spring reunion news post`.
