# Terminal UI — Tokens, Cascade Mechanics & the Phosphor System

## What "semantic token" means here

The technique assumes the app already styles itself through named CSS custom
properties rather than raw colors — e.g. a component reads `bg-primary`,
`text-tertiary`, `border-secondary`, `fg-brand-primary`, never a literal hex
or a Tailwind palette class like `bg-gray-100`. This is exactly Untitled UI's
token system (`src/styles/theme.css` in this repo), but the technique applies
to any design system built the same way (shadcn/ui CSS variables, a custom
`@theme` block, plain CSS custom properties). If the target app hard-codes
colors per component, that's a prerequisite refactor, not something this skin
can paper over — a remap file can only override *tokens*, not literal values
baked into component classNames.

## The cascade-layer trick

Tailwind v4's `@theme { … }` directive compiles into a **cascade layer**
(`@layer theme`). Per the CSS Cascade Layers spec, for non-`!important`
declarations, **any unlayered style beats any layered style**, regardless of
selector specificity or source order. So:

```css
/* deep inside the framework, inside @layer theme */
:root { --color-brand-50: #f9f5ff; }

/* your file, imported last, NOT wrapped in any @layer */
:root, .phosphor-amber { --color-brand-50: #17110a; }
```

The second (unlayered) declaration wins unconditionally — even though both
selectors have identical specificity, even if your file were imported
*before* the framework's CSS. This is what lets one small file re-theme an
entire component library without editing a single component file. Verify it
worked by grepping the compiled dev CSS chunk for the property and confirming
your value, not the framework default, is what a plain `:root` rule resolves
to (see [reskin-checklist.md](reskin-checklist.md) for the exact commands).

The same logic applies to `border-radius: 0 !important` — `!important`
always outranks non-`!important` regardless of layer or origin, so one rule
targeting `*, *::before, *::after` force-squares every vendored/library
component (buttons, badges, inputs, modals) without touching their source.

## File shape

One file (`terminal.css` in this repo), imported **last**, after the
framework's own theme CSS:

```css
@import "tailwindcss";
@import "./theme.css";      /* framework defaults — Untitled UI etc */
@import "./typography.css";
@import "./terminal.css";   /* ours — must be last to win the cascade */
```

Inside it, four sections in this order:

1. **Type system** — override the font tokens once:
   ```css
   :root {
     --font-body: ui-monospace, "SFMono-Regular", "JetBrains Mono",
       "Cascadia Mono", "Cascadia Code", Menlo, Consolas,
       "Liberation Mono", "Courier New", monospace;
     --font-display: var(--font-body);
     --font-mono: var(--font-body);
   }
   ```
2. **Global radius kill**:
   ```css
   *, *::before, *::after { border-radius: 0 !important; }
   ```
3. **Shared semantic tokens**, defined once at `:root`, identical across every
   phosphor color — status meaning must never change with the accent color:
   `text-error-primary`, `text-warning-primary`, `text-success-primary`,
   `border-error`, `border-error_subtle`, `fg-success-*`, `fg-warning-*`,
   `fg-error-*`, `bg-success-*`, `bg-warning-*`, `bg-error-*`, `focus-ring-error`.
4. **One block per phosphor color**, each keyed to a class name
   (`:root, .phosphor-amber { … }` for the default, `.phosphor-green { … }`,
   etc. — the bare `:root` on the default variant makes it the pre-hydration
   color so there's no flash of the wrong theme before JS mounts).

## The "chrome" token set (override this list per color)

These are the only properties that change between phosphor variants. Keep the
list identical across every color block so nothing silently falls back to
another variant's value:

```
--color-brand-50 … --color-brand-950        (11-stop ramp, dark→bright)
--terminal-accent, --terminal-accent-dim     (custom, used by CRT flourishes)

--color-text-primary, -secondary, -secondary_hover, -tertiary, -tertiary_hover,
  -quaternary, -placeholder
--color-text-primary_on-brand, -secondary_on-brand, -tertiary_on-brand, -quaternary_on-brand
--color-text-brand-primary, -brand-secondary, -brand-secondary_hover,
  -brand-tertiary, -brand-tertiary_alt

--color-border-primary, -secondary, -secondary_alt, -tertiary, -brand, -brand_alt

--color-fg-primary, -secondary, -secondary_hover, -tertiary, -tertiary_hover,
  -quaternary, -quaternary_hover
--color-fg-brand-primary, -brand-primary_alt, -brand-secondary,
  -brand-secondary_alt, -brand-secondary_hover

--color-bg-primary, -primary_alt, -primary_hover, -primary-solid
--color-bg-secondary, -secondary_alt, -secondary_hover, -secondary_subtle, -secondary-solid
--color-bg-tertiary, -quaternary, -active
--color-bg-brand-primary, -brand-primary_alt, -brand-secondary,
  -brand-solid, -brand-solid_hover, -brand-section, -brand-section_subtle

--color-focus-ring, --color-toggle-border,
--color-slider-handle-bg, --color-slider-handle-border
```

`--color-bg-primary` is `#000000` in **every** variant — never vary it. The
`_subtle`/`_alt` backgrounds are near-black tints of the accent hue (e.g.
`#0a0c0e` for amber, `#060d09` for green) purely so bordered panels read as
very slightly warmer/cooler than pure black, not a lightness change.

## Shipped 6-color reference palette

| id | name | accent (600) | dim (scrollbar) | inspiration |
|---|---|---|---|---|
| `amber` | AMBER (default) | `#ff9e2c` | `#7a4e12` | Bloomberg terminal |
| `green` | GREEN | `#33ff99` | `#145c33` | classic VT-terminal phosphor |
| `blue` | BLUE | `#4cc4ff` | `#0d3a5c` | IBM 5151-style ice blue |
| `cyan` | CYAN | `#33f5f5` | `#0d4a4a` | early PC / Tandy cyan |
| `red` | RED | `#ff5c52` | `#5c1414` | red phosphor |
| `white` | MONO | `#f2f2f2` | `#5a5a5a` | monochrome "paperwhite" |

Each ramp goes from a near-black tint at `50` to a near-white/near-accent tone
at `950`; the mid stops (`500`–`700`) carry the actual accent hue. Copy the
`.phosphor-amber` block in `src/styles/terminal.css` as the template for a new
color — swap only the hex values, keep every property name.

### Adding a 7th color

1. Pick one accent hex (the `600` stop — what most UI actually renders as
   "the brand color") and a darker "dim" variant for the scrollbar thumb.
2. Derive the 11-stop ramp: `50`/`100`/`200` = near-black tints of the hue,
   `300`/`400` = mid-dark, `500`/`600`/`700` = the accent itself and its
   lighter neighbors, `800`/`900`/`950` = near-white tints.
3. Derive text/border/fg/bg chrome by desaturating/darkening the same hue —
   easiest to eyeball against an existing block (e.g. use `.phosphor-cyan` as
   a template if the new color is also cool-toned).
4. Add the id to the theme provider's array (see below) and a new
   `.phosphor-<id> { … }` block with the full chrome list above.
5. Add a swatch entry to the picker component.

## Multi-color theme provider (not light/dark)

`next-themes`' built-in API is a light/dark binary, but it also accepts an
arbitrary `themes` list — use that instead of `enableSystem`/`light`/`dark`:

```tsx
// providers/theme.tsx
import { ThemeProvider } from "next-themes";

export const PHOSPHOR_THEMES = ["amber", "green", "blue", "cyan", "red", "white"] as const;
export type PhosphorTheme = (typeof PHOSPHOR_THEMES)[number];

const THEME_CLASS_MAP = Object.fromEntries(
  PHOSPHOR_THEMES.map((id) => [id, `phosphor-${id}`]),
) as Record<PhosphorTheme, string>;

export function Theme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" themes={[...PHOSPHOR_THEMES]} defaultTheme="amber" value={THEME_CLASS_MAP}>
      {children}
    </ThemeProvider>
  );
}
```

This persists the choice in `localStorage` and applies `phosphor-<id>` as a
class on `<html>` exactly like next-themes normally does for `dark`/`light` —
no custom persistence code needed.

**Picker component** (replaces a light/dark toggle): a small bracket button
showing a colored swatch + current name, opening a dropdown listing every
`PHOSPHOR_THEMES` entry with its own swatch + name + a checkmark on the active
one. Close on outside-click and `Escape`. Guard the initial render with a
`mounted` boolean (`useEffect(() => setMounted(true), [])`) so the
server-rendered placeholder (`····`) never mismatches the client's persisted
choice — the same hydration guard any `next-themes` toggle needs.

## One gotcha to know about before you go looking for it

Native `<input type="date">` renders browser chrome (calendar icon, popover)
using the CSS `color-scheme` property, not your custom properties — it does
not follow your token remap. Since every phosphor variant has the same true-black
background, set it unconditionally:

```css
input[type="date"] { color-scheme: dark; }
```

Do **not** key this off a specific theme class (e.g. only `.dark-mode`) —
every variant needs it, since every variant's background is black.
