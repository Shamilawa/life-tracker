# Untitled UI — Project Setup

Two paths: new project (trivial) and existing project (has traps). Both end in the
same place: Tailwind v4 + theme CSS + React Aria deps + the `@/` alias.

## New project

```bash
npx untitledui@latest init my-app --vite -y     # or --nextjs
cd my-app && npm run dev
```

Everything is preconfigured: Tailwind v4, theme files, all base components, hooks,
`cx` util, prettier with class sorting. Prefer this whenever starting fresh.

## Existing project (Vite + React shown; Next.js analogous)

### 1. Add components (deps come with them)

```bash
npx untitledui@latest add button badges input select modal tooltip avatar progress-indicators -y
```

This installs `react-aria-components`, `@untitledui/icons`, `tailwind-merge`, adds
`"paths": { "@/*": ["./src/*"] }` to tsconfig, and copies sources into
`src/components/{base,application,foundations}` plus `src/utils/cx.ts`.

### 2. Install the Tailwind foundation (the CLI does NOT do this)

```bash
npm i tailwindcss @tailwindcss/vite tailwindcss-react-aria-components tailwindcss-animate @tailwindcss/typography
```

### 3. Get the theme files

The theme is ~45KB of CSS variables — don't try to write it by hand. Scaffold the
official starter in a temp/scratch directory and copy from it:

```bash
npx untitledui@latest init uui-ref --vite -y      # in a temp dir
```

Copy from `uui-ref/src/styles/` into your project's `src/styles/`:
- `theme.css` — all design tokens (colors, spacing, shadows, radii, type)
- `typography.css` — text scale incl. `text-display-*` sizes
- `globals.css` — imports the above + Tailwind, registers plugins and custom
  variants (dark mode, scrollbar-hide, etc.)

The starter is also the reference for anything else you need later: additional
components the CLI can't resolve by name, hooks (`use-breakpoint`,
`use-resize-observer`), the theme-provider, sidebar navigation components.

### 4. Wire the build

`vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

(`fileURLToPath` avoids needing `@types/node` for `path`.)

Entry file (`main.tsx`): `import './styles/globals.css'` (replace any old global CSS).

`index.html` — load Inter (weights 400–600 are what the components use):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```

### 5. tsconfig adjustments

```jsonc
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "noUnusedLocals": false,      // vendor components have unused imports;
    "noUnusedParameters": false   // the official starter lints these via ESLint instead
  }
}
```

Without this, `tsc` fails on the library's own code (e.g. an unused `React` import
in `button.tsx`) and you'll be tempted to edit vendor files — don't.

Also check `target`: older scaffolds (e.g. Next.js defaults from years past) use
`"target": "es5"`, which breaks vendor components that iterate `Set`s
("TS2802: Type 'Set<Key>' can only be iterated…"). Bump to `ES2017`+ — and if the
error persists after the change, delete `tsconfig.tsbuildinfo` (stale incremental
cache) and re-run.

### Next.js notes

The same recipe works in Next.js with two differences: Tailwind v4 runs through
`@tailwindcss/postcss` (already present in new Next projects — no Vite plugin
needed, no vite.config), and the theme CSS lives next to `app/globals.css`
(import `./theme.css` / `./typography.css` from it). The `@/*` alias in a
no-`src` Next project maps to the repo root, which matches the CLI's
`components/` + `utils/` output exactly.

### 6. Restart the dev server

Adding the Tailwind Vite plugin is a config change; hot reload won't pick it up.
Kill and restart `npm run dev`, then verify a `<Button>` renders with the brand
purple background — if it renders as an unstyled HTML button, `globals.css` isn't
imported or the Tailwind plugin isn't active.

## Known component-specific traps

- `empty-state` imports `@untitledui/file-icons` and
  `@/components/shared-assets/illustrations` — two extra dependency trees for one
  component. Unless you need its illustrations, build empty states directly:
  `FeaturedIcon` + heading + body + primary Button (see layout-patterns.md).
- `charts-base` requires `recharts` (heavy). Only add it if you'll use their charts.
- Sidebar/app-navigation components in the starter import `react-router` — if your
  app doesn't use react-router, build your own sidebar (layout-patterns.md has a
  recipe) instead of pulling in a router you don't need.
