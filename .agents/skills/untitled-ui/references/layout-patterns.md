# Untitled UI — Layout Patterns for Professional App UIs

The difference between "assembled from components" and "designed" is almost entirely
structure: one shared frame, one shared page skeleton, consistent card grammar, and
a strict typographic hierarchy. Build these once as reusable components.

## App shell (sidebar + top bar)

Structure — render once at the root, everything else is children:

```
<div class="flex h-dvh bg-primary">
  <aside class="flex w-66 shrink-0 flex-col border-r border-secondary bg-primary">
    brand row (h-16, border-b) · nav sections · footer card
  </aside>
  <div class="flex min-w-0 flex-1 flex-col">
    <header class="flex h-16 shrink-0 items-center justify-between border-b border-secondary bg-primary px-6">
      global search (left) · status chip · divider · Avatar + name/email (right)
    </header>
    <main class="flex-1 overflow-y-auto bg-secondary_subtle">{children}</main>
  </div>
</div>
```

Sidebar details that read as "professional":
- Section labels: `text-xs font-semibold tracking-wide text-quaternary uppercase`
  ("GENERAL", "TOOLS" — group nav, don't pile 8 flat items)
- Nav item: `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold`;
  active = `bg-active text-secondary_hover`; idle = `text-secondary
  hover:bg-primary_hover`; icon `size-5 text-fg-quaternary`
- Live count badges on items (`Badge size="sm" color="gray"`) — real data only
- Collapse toggle → icon-only rail (`w-17`), labels hidden, `title` tooltips
- Footer: a small ring-1 card (sync/plan/team status) + muted copyright line

Make the shell **generic**: nav sections, user info, and search handler come in as
props. App code declares content; the shell owns structure.

## Page skeleton

Every screen renders through one `Page` component — this single habit does more for
perceived quality than any styling choice:

```tsx
<Page
  title="Goals"                          // text-lg font-semibold
  titleTrailing={<StatusBadge … />}      // badges inline after the title
  description="Supporting one-liner"     // text-sm text-tertiary
  actions={<Button …>Add goal</Button>}  // right-aligned
  back={{ label: 'All goals', onClick }} // optional link-gray + ArrowLeft above title
>
  {content}
</Page>
```

Container: `mx-auto max-w-7xl px-8 py-6`; content starts `mt-6` after the header.

**The Page owns the width — content must fill it.** The `max-w-*` cap lives on the
Page container once, and both the header and the content sit inside it. Do NOT wrap a
screen's content in a *narrower* `max-w-*` (e.g. `mx-auto max-w-4xl`) — that indents
the content while the title still spans the full Page width, so the page looks broken
(a full-width heading floating above a narrow, centered body). It's a tempting
"readability" reflex on form/report pages; resist it. If a specific block genuinely
needs a reading measure (a long prose column), cap that one block — never the whole
page body. When a page looks too wide, narrow the Page container itself, not the
content inside it, so header and body stay aligned.

**Fold discipline**: the user's primary *action* (form, check-in, composer) belongs
in the first viewport — beside the main visualization, not below it. History,
settings, and reference material go below the fold.

## Card grammar

One card style everywhere: `rounded-xl bg-primary shadow-xs ring-1 ring-secondary`
on the `bg-secondary_subtle` canvas.

- Stat/KPI card: `p-5`; label `text-sm font-medium text-tertiary`, value
  `text-display-xs font-semibold text-primary`, sub-line `text-sm text-tertiary`.
  Row of 3–4: `grid grid-cols-3|4 gap-4`. A `ProgressBarCircle` can *be* the value —
  don't show the circle and the same % as text.
- Section card: `p-6` with an `h2 text-md font-semibold` header row (title left,
  meta/legend right), content `mt-4`. For list-style cards, a `border-b
  border-secondary px-6 py-4` header + `divide-y divide-border-secondary` rows.
- Two-column detail layouts: `grid grid-cols-[1fr_360px] items-start gap-4`
  (main content + action rail).

## Data tables

```html
<div class="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
  <table class="w-full">
    <thead>
      <tr class="border-b border-secondary bg-secondary_subtle">
        <th class="px-5 py-3 text-left text-xs font-semibold text-quaternary">…</th>
```

Rows: `border-b border-secondary last:border-b-0`, cells `px-5 py-4`; clickable rows
get `cursor-pointer hover:bg-primary_hover transition duration-100`. Primary cell =
`text-sm font-medium text-primary` + truncated `text-sm text-tertiary` subtitle.
Types/categories as gray Badges; statuses as BadgeWithDot; dates `text-sm text-tertiary`.
Precede the table with a stat-card summary row — orientation before detail.

## Empty states

Don't ship a bare "no data". Center in the content area:

```tsx
<div className="mx-auto flex max-w-sm flex-col items-center pt-16 text-center">
  <FeaturedIcon color="brand" theme="modern" size="lg" icon={Target} />
  <h3 className="mt-4 text-lg font-semibold text-primary">Set your first goal</h3>
  <p className="mt-1 text-sm text-tertiary">One sentence of direction, not apology.</p>
  <Button className="mt-6" size="md" onClick={cta}>Add goal</Button>
</div>
```

## Modals

Header (title `text-lg font-semibold` + optional step indicator + tertiary icon-only
close) · body `mt-5 flex flex-col gap-4` of labeled Inputs/Selects · footer
`mt-8 flex justify-end gap-3` (secondary "Back"/"Cancel", then primary). Multi-step
wizards: "Step 2 of 3" under the title; a type/option picker step uses the selectable
card idiom from components.md.

## The anti-"AI-slop" checklist

Before calling a screen done:
- Zero raw palette classes; zero hardcoded hex outside theme.css
- Font sizes drawn from the scale — nothing rendered outside 12–30px in app chrome;
  charts/SVGs render text at true pixel size (no viewBox stretching)
- One primary button visible; actions right-aligned in headers
- Content fills the Page width — header and body share the same left/right edges; no
  inner `max-w-*` wrapper indenting the body below a full-width title
- Every icon-only button has a tooltip/aria-label; every input has a real label
- Numbers formatted (`toLocaleString()`), dates human ("Aug 28, 2026"), em dash for
  absent values — never "null", "N/A", or raw ISO strings
- Hover states on everything interactive (`transition duration-100`)
- Sentence case; no exclamation marks in system copy; no emoji in UI chrome
- Empty, loading, and error states designed — not afterthoughts
