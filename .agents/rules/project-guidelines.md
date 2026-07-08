# Project Guidelines & Standards

This rule applies to all file modifications and creations within this repository to maintain consistency across the codebase.

## 1. Import Naming Convention
**CRITICAL**: All imports from `react-aria-components` must be prefixed with `Aria*` to prevent naming conflicts with custom components.
- ✅ Correct: `import { Button as AriaButton, TextField as AriaTextField } from "react-aria-components";`
- ❌ Incorrect: `import { Button, TextField } from "react-aria-components";`

## 2. File Naming Convention
**CRITICAL**: All files (including `.tsx`, `.ts`, `.css`) MUST be named in **kebab-case**.
- ✅ Correct: `date-picker.tsx`, `api-client.ts`, `user-profile.tsx`
- ❌ Incorrect: `DatePicker.tsx`, `apiClient.ts`, `UserProfile.tsx`

## 3. Styling Guidelines (Tailwind CSS v4.2)
- **Theme Colors**: MUST use semantic color classes to style elements.
  - ✅ Good: `text-primary`, `bg-primary`, `text-secondary`, `border-brand`
  - ❌ Bad: `text-gray-900`, `bg-blue-700`
- **Disabled States**: All components use `opacity-50` for disabled states. Do not use individual disabled color tokens.
  - ✅ Correct: `disabled:cursor-not-allowed disabled:opacity-50`
- **Transitions**: For default small transitions (hover states, color changes), use: `transition duration-100 ease-linear`.

## 4. Icon Usage
- Import icons from `@untitledui/icons`.
  - Recommended: `import { Home01, ChevronDown } from "@untitledui/icons";`
- When passing icons to components as an element, it MUST include the `data-icon` attribute:
  - `<Button iconLeading={<ChevronDown data-icon className="size-4" />}>Options</Button>`
- For decorative icons, ensure accessibility with `aria-hidden="true"`.

## 5. Component Patterns
- Base components are located in `src/components/base/`.
- Use React Aria Components as the foundation for accessibility.
- Follow the compound component pattern for complex components (e.g., `Select.Item`, `Select.ComboBox`).
- Always use the provided utility functions like `cx()` and `sortCx()` for styling organization.

## 6. Architecture & Data Flow
- **DB**: SQLite via `@libsql/client` with Drizzle ORM.
- **Server Actions**: Mutations are server actions in `src/lib/actions.ts` and should call `revalidatePath("/", "layout")`.
- **Data Fetching**: Server components call `src/lib/queries.ts`.
