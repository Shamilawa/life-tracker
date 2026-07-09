# Terminal UI — Reskin Checklist (Existing App vs. New App)

Both paths converge after step 1 — a new app just needs the semantic-token
foundation built first (a normal design-system setup), then the same sweep
applies.

## Path A — reskinning an existing app

### 0. Confirm the prerequisite

Grep the app for raw palette classes in component code (`text-gray-`,
`bg-blue-`, hex literals in `className`). If they're everywhere, this isn't a
CSS-only reskin — do a semantic-token pass first (or accept that those
specific components won't reskin automatically and need manual edits).

### 1. Add the token-remap file

Create the terminal CSS file (see [tokens.md](tokens.md) for full contents)
and import it **last**:

```css
@import "tailwindcss";
@import "./theme.css";
@import "./typography.css";
@import "./terminal.css";  /* must be last */
```

### 2. Swap the theme provider

Replace a light/dark `next-themes` setup with the multi-color phosphor
version (or keep just 2–3 colors if that's all the user wants — the mechanism
is identical, just fewer `themes` array entries and CSS blocks).

### 3. Fix the one CSS token the remap can't reach

Native `<input type="date">` color-scheme — see the gotcha at the end of
tokens.md. Set it unconditionally to `dark`, not keyed to any theme class.

### 4. Rebuild and verify the base skin took effect

```bash
npm run build   # confirms no TypeScript/compile breakage from the CSS-only change
```

Then spot-check the cascade actually applied — don't just eyeball a
screenshot (see "stale cache is a red herring" trap below):

```bash
# find the compiled dev CSS chunk
find .next -iname "*.css" | xargs grep -l "phosphor-amber"
# confirm your override, not the framework default, is what :root carries
grep -n -- "--color-brand-50:" <that file>
```

You should see your remap file's value declared in an unlayered block *after*
the framework's own (layered) declaration in the same file — that ordering
plus the layer difference is what makes yours win regardless of which one is
physically first in the source.

### 5. Sweep every view for the component vocabulary

This is the step that's easy to half-do — fixing the app shell and one page
convincingly, then leaving the rest of the app in the old visual language.
Go route by route:

- [ ] Cards: `rounded-* shadow-* ring-*` → flat `border border-secondary
      bg-secondary_subtle` (components.md)
- [ ] Status badges/pills → bracket tags
- [ ] Circular/donut progress → ASCII meter
- [ ] Every `Button`/`ButtonUtility` (or equivalent) → the 3-variant bracket
      button
- [ ] Rounded numbered/avatar circles → square bracket index boxes
- [ ] Empty states: icon tile → single glyph in a bordered square
- [ ] Section headings → `── LABEL` convention
- [ ] **Modals/dialogs** — easy to forget because they're not visible until
      opened. If left unswept they'll look jarringly like the old design
      system the moment a user clicks "Add" or "Edit". Sweep them with the
      same table.
- [ ] Any inline SVG charts/graphs — recolor with the CSS vars directly
      (`var(--color-fg-brand-primary)` etc.), not hardcoded hex.

### 6. Re-verify after the sweep

```bash
npm run build
```

Then actually load 2–3 routes (including one you didn't just edit) in a
browser with a hard refresh, not just the route you were focused on — visual
regressions hide in routes you didn't touch this session.

### Trap: "it still looks wrong" might be a stale cache, not a bad override

If a color looks visibly wrong (e.g. a badge renders bright/light when the
math says it should be near-black), don't assume the CSS mechanism failed —
first rule out a stale bundle: hard-refresh the browser tab, confirm the dev
server picked up the latest file (Turbopack/webpack HMR on global CSS
occasionally needs a manual reload), and *then* go verify the compiled CSS as
in step 4 if it's still wrong. Chasing a cascade bug that doesn't exist wastes
far more time than a hard refresh.

## Path B — building a new app in this style

1. Set up the semantic-token foundation first — this skill is a skin, not a
   foundation. If the stack is Untitled UI, follow that skill's setup flow to
   get `theme.css`/`globals.css`/Tailwind v4 wired, *then* layer this skill on
   top. If it's a different design system, ensure it exposes color as CSS
   custom properties the same way before starting here.
2. Follow the Quick Recipe in [SKILL.md](../SKILL.md) steps 2–5 from scratch
   — there's no "existing views" sweep because there are no views yet; just
   build every new screen directly with the terminal vocabulary from
   components.md instead of a default component-library look.
3. Recommended file layout (mirrors what this skill's reference
   implementation uses):
   ```
   styles/terminal.css              — the token remap (tokens.md)
   providers/theme.tsx               — phosphor ThemeProvider (tokens.md)
   components/app/app-shell.tsx      — command bar + sidebar + status line (layout.md)
   components/app/page.tsx           — shared page header (layout.md)
   components/app/term-button.tsx    — 3-variant bracket button (components.md)
   components/app/theme-toggle.tsx   — phosphor picker dropdown (tokens.md)
   ```
4. Build/verify the same way as Path A steps 4/6 — there's just no "sweep"
   step since nothing pre-existed to clean up.
