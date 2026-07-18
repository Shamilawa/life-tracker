# Lifestyle OS

Personal lifestyle tracker (habits, goals, routines) with an AI assistant planned for Phase 2. Single-user, local-first.

## App-specific commands

```bash
npm run dev        # Next.js dev server (Turbopack), http://localhost:3000
npm run build      # Production build
npm run db:push    # Apply schema changes to the Postgres DB (drizzle-kit push)
npm run db:seed    # Wipe and reseed demo data (src/lib/db/seed.ts)
npm run db:studio  # Browse the database
```

## App architecture

- **DB**: Postgres (Neon/Vercel Postgres) via `@neondatabase/serverless` (`drizzle-orm/neon-http`), configured with `DATABASE_URL` (gitignored `.env`; currently the `tracker_db_dev` Neon branch). Drizzle ORM; schema in `src/lib/db/schema.ts`. The neon-http driver doesn't support `db.transaction()`.
- **Data flow**: server components call `src/lib/queries.ts`; mutations are server actions in `src/lib/actions.ts` (each calls `revalidatePath("/", "layout")`).
- **Dates**: habit logs key off local calendar dates as `YYYY-MM-DD` strings (`src/lib/dates.ts`). Days of week are `0 = Sunday … 6 = Saturday`, stored as JSON arrays.
- **Domain model**: Goal ← Milestone; Goal ← Habit ← HabitLog (unique per habit+date, status done/skipped, missing row = missed); Routine ← RoutineItem → Habit; Task (optionally → Goal/Milestone).
- **App components** live in `src/components/app/` (shell, page skeleton, views, modals). Vendored Untitled UI components in `base/`, `application/`, `foundations/` must not be hand-edited.
- **Routes**: `/` Today (day workspace), `/insights`, `/goals`, `/habits`, `/routines`, `/assistant`. Most pages render through `src/components/app/page.tsx` inside the `AppShell`; the Today and Assistant pages are custom full-height layouts instead.
- **Today page** (`src/app/page.tsx`): date-aware via `?date=YYYY-MM-DD` (defaults today). Two columns — left `RoutineSummary` (habits grouped by `category` + tasks, List/Group toggle, checkable) and right `JournalEditor` (TipTap rich-text per day). Header shows the date, a "% DONE" badge, and prev/today/next nav. Data from `getDayView(date)`. Rule: habit/task check-off is interactive only on today; the journal is editable for today + past days, read-only for future. Habits carry optional `startTime`/`endTime` ("HH:MM") and a free-text `category`. The `AppShell` header hides its date on `/` to avoid duplication.
- **Journal**: TipTap v2 (`src/components/app/journal-editor.tsx`), content stored as TipTap JSON in the `daily_notes` table (date-keyed) via `saveDailyNote(date, content)` (autosave + Save button; blocks future dates). Editor content is styled with theme-token arbitrary variants (not `prose`) so it works in dark mode. Images embed as base64.
- `tsconfig.json` excludes unused vendored modules (date-picker, carousel, marketing) that have type skew with the installed react-aria; remove from `exclude` when adopting them.

## Assistant (Phase 2)

Uses **OpenAI** (`openai` package, model `gpt-4o`) — not Anthropic — because that's the API key the user has. Provider is isolated to the API route; the tool layer and UI are provider-neutral.

- **Route**: `POST /api/chat` (`src/app/api/chat/route.ts`) streams NDJSON events (`{type:"text"|"tool"|"done"|"error"}`). Uses `chat.completions.create({stream:true, tools})` in a manual agentic loop (max 6 iterations); accumulates OpenAI's fragmented `tool_call` deltas by index. Needs `OPENAI_API_KEY` (in gitignored `.env`); returns 503 `{error:"missing_api_key"}` when unset (UI shows a notice).
- **Tools**: `src/lib/assistant/tools.ts` — `tools` is `OpenAI.Chat.Completions.ChatCompletionTool[]` built from neutral `specs`. Read tools (`get_today`/`get_habits`/`get_goals`/`get_routines`/`get_insights`) return compact JSON from `queries.ts`; write tools (`log_habit`/`create_habit`/`create_task`/`complete_task`/`create_goal`/`add_milestone`) resolve habit/goal/task names loosely to IDs, then call `actions.ts`. `executeTool(name, input)` is provider-agnostic. Descriptions are prescriptive ("Call this when…").
- **History**: persisted in the `chat_messages` table (`src/lib/assistant/history.ts`). Only conversational text + tool names are stored (tools re-run against live data each turn); cleared via `clearChatHistory()` in `actions.ts`.
- **UI**: `src/components/app/assistant-chat.tsx` (full-height chat, not the `Page` skeleton) reads the NDJSON stream and renders tool-activity chips.

## Proactive signals (Phase 3, in progress)

Twice-daily generated briefings so the assistant surfaces something before being asked — the first piece of turning it from a reactive chatbot into a proactive assistant (see the "From Chatbot to Personal Assistant" plan; Phase A of 5).

- **Generation**: `src/lib/assistant/briefing.ts` — `recordBriefing(kind: "morning"|"evening")` gathers context by calling the existing read tools' `executeTool` from `tools.ts` (same JSON the chat already uses), makes one non-streaming `gpt-4o` call with a synthesis-tuned prompt, and inserts the result into `assistant_signals`.
- **Trigger**: two Vercel Cron routes, `GET /api/cron/morning-briefing` and `GET /api/cron/evening-review` (`src/app/api/cron/*/route.ts`), scheduled in `vercel.json` (`30 1 * * *` / `30 14 * * *` UTC = 7am/8pm IST). Auth via `Authorization: Bearer $CRON_SECRET` (gitignored `.env`), fail-closed if unset. Cron only fires once deployed to Vercel — not yet deployed as of this writing, so trigger manually with the same header to test locally.
- **Storage/delivery (in-app)**: `assistant_signals` table (`schema.ts`) — `dismissedAt` null = unseen. `getAssistantSignals()` (`queries.ts`) reads, `dismissSignal(id)` (`actions.ts`) writes and calls the shared `refresh()` (not a narrow path — the nav badge is layout-level). Threaded from `layout.tsx`/`assistant/page.tsx` through `AppShell` (unseen-count badge on the Assistant nav item) and `AssistantDrawer` into `AssistantChat` (dismissible cards above the chat).
- **Delivery (Telegram, Phase B, done)**: `src/lib/assistant/telegram.ts` wraps the Bot API (`sendTelegramMessage`, `answerCallbackQuery`, `clearInlineKeyboard`) using `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (gitignored `.env`). `recordBriefing` pushes every briefing to Telegram (best-effort — wrapped in try/catch, DB row is authoritative) as plain text, no buttons — the morning briefing used to attach one inline "log" button per still-pending habit, but that was dropped once per-task due-time reminders (see "Due-time reminders" below) took over surfacing individual actionable items at the moment they're relevant; the briefing itself stays a read-only summary. The webhook's `log:<habitId>` handling (below) is now dead code from the assistant's own side — kept only because nothing forces its removal, not because anything still sends it.
- **Telegram is a second client for the same assistant**: `POST /api/telegram/webhook` (`src/app/api/telegram/webhook/route.ts`) verifies `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET`, then branches on `message.text` (runs `runAssistantTurn()` from the new `src/lib/assistant/run.ts` — a non-streaming sibling of `/api/chat`'s loop, sharing the same `chat_messages` history so both surfaces are one continuous conversation) or `callback_query` (parses the `log:<habitId>` data, calls `setHabitLog` directly — no LLM round-trip needed since the button already carries the exact id). Both branches always return `200 {ok:true}` and do all real work inside `after()` from `next/server`: Telegram retries non-200/timed-out deliveries with the identical update, and `create_task`/`create_habit`/`create_goal` aren't idempotent, so avoiding retries (fast ack + background work) matters more here than in the cron routes. The shared system prompt lives in `src/lib/assistant/prompt.ts` (`assistantSystemPrompt()`), imported by both `/api/chat/route.ts` and `run.ts`.
- **`setWebhook` not yet called**: needs a public HTTPS URL, so it's a manual one-time step at deploy time (`POST https://api.telegram.org/bot<token>/setWebhook` with `url` + `secret_token: TELEGRAM_WEBHOOK_SECRET`). Verified locally instead by spoofing Telegram's request shape directly at the route (correct secret header, hand-built `Update` JSON).
- **Preferences (Phase C, done)**: `assistant_preferences` is a single global row (no per-user keying — confirmed single-user by `AppShell`'s own "single-user · local-first" badge) — `tone` (`"concise"|"detailed"`), `focus` (free text), `mutedTopics` (string array). `getAssistantPreferences()` (`queries.ts`) always returns a usable object (in-memory defaults when no row exists yet), `saveAssistantPreferences()` (`actions.ts`) is a select-then-branch upsert mirroring `saveDailyNote`. `src/lib/assistant/prompt.ts` exports `preferenceInstructions(prefs)` — the shared phrasing both `assistantSystemPrompt()` (now async, used by web chat + Telegram) and `briefing.ts`'s own `systemPrompt()` append, so tone/focus/muted-topic guidance is consistent everywhere text gets generated. Muting is *instructional* in chat and briefing text (the model is told not to proactively raise a topic, but still answers direct questions about it) and *deterministic* in flag scoring (`getTopFlags` excludes matching flags outright — loose case-insensitive match, same philosophy as `tools.ts`'s `findByName`). Editable via a settings icon in `AssistantChat`'s header → `src/components/app/preferences-modal.tsx` (first usage of `InputTagsOuter` in this app), threaded down the same `layout.tsx`/`assistant/page.tsx` → `AppShell` → `AssistantDrawer` → `AssistantChat` prop chain as `signals`.
- **Triage/loop-closing (Phase D, done)**: `assistant_flags` (schema.ts) tracks three deterministic "needs attention" conditions independent of the prose briefings — `habit_at_risk` (`due30 >= 5 && consistency30 < 50`), `task_overdue` (mirrors `getTodayView().overdueTasks`), `goal_deadline_risk` (`status === "active" && targetDate <= today+14d && progress < 70`, no lower bound so an already-slipped deadline is the highest-priority case, not excluded). `src/lib/assistant/flags.ts`'s `syncFlags()` does the detect/open/update/resolve reconciliation (select-then-branch, no DB unique constraint — matches this schema's usual upsert convention) — a flag's `resolvedAt` gets set automatically the moment it stops being a candidate, so closing the loop needs no explicit action anywhere. `getTopFlags(prefs, limit)` scores open flags (`typeWeight × stalenessMultiplier(daysFlagged) × focusMultiplier`, flat function, not a framework — exactly 3 types) and excludes anything matching `mutedTopics` (muting now also means "don't flag"). `recordBriefing` calls `syncFlags()` + `getTopFlags(prefs, 3)` and threads them into a `FLAGGED` context block the briefing prompt is told to lead with, mentioning staleness naturally ("third day now") instead of raw numbers. The same capability reaches the interactive assistant via a new `get_flags` read tool (`tools.ts`) — asked-for, so capped at 10 instead of 3 — giving both web chat and Telegram triage-aware answers to "what's slipping?" without waiting for the next pushed briefing.
- **Graduated autonomy (Phase E, done — last of the original 5-phase proposal)**: the tier boundary here isn't reversibility (every write in this app is a reversible DB row) — it's *recording a reported fact* (existing tools: `log_habit`, `create_task`, etc., already instructed to execute directly) vs. *the assistant proposing a change to the user's existing plan* (new: `reschedule_task`, `archive_habit`, `extend_goal_deadline` in `tools.ts`). The three new tools mirror the existing write-tool pattern exactly (loose name matching via `findByName`) but each description explicitly instructs propose-then-wait-for-explicit-yes, reinforced by a general paragraph in `assistantSystemPrompt()` (`prompt.ts`) drawing the contrast against the adjacent "reversible logging... done directly" paragraph. `reschedule_task` → new `updateTaskDueDate` action (mirrors `updateMilestoneDueDate`); `archive_habit`/`extend_goal_deadline` reuse the existing `archiveHabit`/`updateGoal` actions directly.
  - **Telegram side**: `recordBriefing` sends one extra "Suggestion: ..." message (morning only) for the highest-scored flag that has an eligible `suggestedAction()` (`flags.ts`) — `task_overdue` always eligible, `goal_deadline_risk` always eligible, `habit_at_risk` only once `daysFlagged >= 14` (a rough week shouldn't trigger an archive suggestion). `[Do it]`/`[Not now]` buttons — tapping *is* the confirmation, no second step, since the message already stated the specific proposed change. The webhook's `callback_query` branch (`route.ts`) extends the existing `log:<habitId>` scheme with `resched:<taskId>`, `archive:<habitId>`, `extend:<goalId>`, `skip:<flagId>`; each remediation branch also calls `syncFlags()` immediately so the flag closes without waiting for the next scheduled sync. `"Not now"` sets a new `assistantFlags.suggestionDismissedAt` column (`dismissFlagSuggestion` in `flags.ts`) — stops the suggestion, not the flag itself (still shown in prose/`get_flags`); naturally resets on a fresh occurrence since `syncFlags()` never reopens an old resolved row.
- **Original 5-phase proposal complete.** "Preferred briefing time" remains explicitly descoped — the cron schedule is static `vercel.json` config, not app data, and this app has no timezone infrastructure to make a time preference meaningful yet. None of Phases A-E have been deployed to Vercel — cron and the Telegram webhook are verified locally (manual trigger / spoofed requests) but won't run unattended until deployed.
- **Due-time reminders (Phase F, done)**: tasks got two new columns — `dueTime` (`"HH:MM"`, optional) and `reminderSentAt`. `src/lib/assistant/reminders.ts`'s `sendDueTaskReminders()` finds undone tasks due today whose `dueTime` falls in `[now, now+15min)` and haven't been reminded yet, sends a Telegram message with a single `[✅ Completed]` button (`callback_data = "complete:<taskId>"`), then stamps `reminderSentAt` — the stamp (not the cron cadence) is what makes this idempotent, so the cron can run as often as the hosting plan allows without double-sending. Triggered by `GET /api/cron/task-reminders` (same `CRON_SECRET` auth pattern as the other two crons), but *not* via `vercel.json` — Vercel Hobby plans only run crons once a day, which breaks a 15-minute check. Instead `.github/workflows/task-reminders.yml` pings the route every 5 minutes (`workflow schedule`, GitHub Actions' own minimum granularity); the route itself doesn't care who calls it, just that the `CRON_SECRET` bearer token matches. Needs a repo secret `CRON_SECRET` (same value as the app's) and a repo variable `APP_URL` (the deployed origin) set in GitHub — Settings → Secrets and variables → Actions. Caveat: GitHub auto-disables scheduled workflows after 60 days of no repository activity, so a long-dormant repo silently stops sending reminders until the next commit. `updateTaskDueTime` (`actions.ts`) clears `reminderSentAt` on change so a rescheduled time gets its own reminder instead of staying silently "sent." Set from the UI via a due-time input next to due-date on task creation (Today page's ad-hoc add-task form, and the goal detail page's task form) and via the assistant's `create_task` tool's new `due_time` param — same 15-minutes-before behavior either way. The webhook's `complete:<taskId>` case calls `toggleTask` directly, mirroring `log:<habitId>`'s no-LLM-round-trip shape.

## Roadmap context

Phase 1 (done): CRUD + daily check-off + insights. Phase 2 (done): OpenAI-powered assistant with read/write tools over the data layer. Phase 3 (done, not deployed): proactive briefings via cron + in-app delivery + Telegram (two-way) + persistent preferences + deterministic triage/loop-closing + graduated autonomy — the full original 5-phase proactive-assistant proposal is code-complete. Phase 4: analytics depth, calendar, PWA.

---

## Project Overview

This is an **Untitled UI React** component library project built with:

- **React 19** with TypeScript
- **Tailwind CSS v4.2** for styling
- **React Aria Components** as the foundation for accessibility and behavior

## Key Architecture Principles

### Component Foundation

- All components are built on **React Aria Components** for consistent accessibility and behavior
- Components follow the compound component pattern with sub-components (e.g., `Select.Item`, `Select.ComboBox`)
- TypeScript is used throughout for type safety

### Import Naming Convention

**CRITICAL**: All imports from `react-aria-components` must be prefixed with `Aria*` for clarity and consistency:

```typescript
// ✅ Correct
import { Button as AriaButton, TextField as AriaTextField } from "react-aria-components";
// ❌ Incorrect
import { Button, TextField } from "react-aria-components";
```

This convention:

- Prevents naming conflicts with custom components
- Makes it clear when using base React Aria components
- Maintains consistency across the entire codebase

### File Naming Convention

**IMPORTANT**: All files must be named in **kebab-case** for consistency:

```
✅ Correct:
- date-picker.tsx
- user-profile.tsx
- api-client.ts
- auth-context.tsx

❌ Incorrect:
- DatePicker.tsx
- userProfile.tsx
- apiClient.ts
- AuthContext.tsx
```

This applies to all file types including:

- Component files (.tsx, .jsx)
- TypeScript/JavaScript files (.ts, .js)
- Style files (.css, .scss)
- Test files (.test.ts, .spec.tsx)
- Configuration files (when creating new ones)

## Development Commands

```bash
# Development
npm run dev               # Start Vite development server (http://localhost:5173)
npm run build            # Build for production (TypeScript compilation + Vite build)
```

## Project Structure

### Application Architecture

```
src/
├── components/
│   ├── base/              # Core UI components (Button, Input, Select, etc.)
│   ├── application/       # Complex application components
│   ├── foundations/       # Design tokens and foundational elements
│   ├── marketing/         # Marketing-specific components
│   └── shared-assets/     # Reusable assets and illustrations
├── hooks/                 # Custom React hooks
├── pages/                 # Route components
├── providers/             # React context providers
├── styles/               # Global styles and theme
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

### Component Patterns

#### 1. Base Components

Located in `components/base/`, these are the building blocks:

- `Button` - All button variants with loading states
- `Input` - Text inputs with validation and icons
- `Select` - Dropdown selections with complex options
- `Checkbox`, `Radio`, `Toggle` - Form controls
- `Avatar`, `Badge`, `Tooltip` - Display components

#### 2. Application Components

Located in `components/application/`, these are complex UI patterns:

- `DatePicker` - Calendar-based date selection
- `Modal` - Overlay dialogs
- `Pagination` - Data navigation
- `Table` - Data display with sorting
- `Tabs` - Content organization

#### 3. Styling Architecture

- Uses a `sortCx` utility for organized style objects
- Follows size variants: `sm`, `md`, `lg`, `xl`
- Color variants: `primary`, `secondary`, `tertiary`, `destructive`, etc.
- Responsive and state-aware styling with Tailwind

#### 4. Component Props Pattern

```typescript
interface CommonProps {
    size?: "sm" | "md" | "lg";
    isDisabled?: boolean;
    isLoading?: boolean;
    // ... other common props
}

interface ButtonProps extends CommonProps, HTMLButtonElement {
    color?: "primary" | "secondary" | "tertiary";
    iconLeading?: FC | ReactNode;
    iconTrailing?: FC | ReactNode;
}
```

## Styling Guidelines

### Tailwind CSS v4.2

- Uses the latest Tailwind CSS v4.2 features
- Custom design tokens defined in theme configuration
- Consistent spacing, colors, and typography scales

### Brand Color Customization

To change the main brand color across the entire application:

1. **Update Brand Color Variables**: Edit `src/styles/theme.css` and modify the `--color-brand-*` variables
2. **Maintain Color Scale**: Ensure you provide a complete color scale from 25 to 950 with proper contrast ratios
3. **Example Brand Color Scale**:
    ```css
    --color-brand-25: rgb(252 250 255); /* Lightest tint */
    --color-brand-50: rgb(249 245 255);
    --color-brand-100: rgb(244 235 255);
    --color-brand-200: rgb(233 215 254);
    --color-brand-300: rgb(214 187 251);
    --color-brand-400: rgb(182 146 246);
    --color-brand-500: rgb(158 119 237); /* Base brand color */
    --color-brand-600: rgb(127 86 217); /* Primary interactive color */
    --color-brand-700: rgb(105 65 198);
    --color-brand-800: rgb(83 56 158);
    --color-brand-900: rgb(66 48 125);
    --color-brand-950: rgb(44 28 95); /* Darkest shade */
    ```

The color scale automatically adapts to both light and dark modes through the CSS variable system.

### Style Organization

```typescript
export const styles = sortCx({
    common: {
        root: "base-classes-here",
        icon: "icon-classes-here",
    },
    sizes: {
        sm: { root: "small-size-classes" },
        md: { root: "medium-size-classes" },
    },
    colors: {
        primary: { root: "primary-color-classes" },
        secondary: { root: "secondary-color-classes" },
    },
});
```

### Utility Functions

- `cx()` - Class name utility (from `@/utils/cx`)
- `sortCx()` - Organized style objects
- `isReactComponent()` - Component type checking

## Icon Usage

### Available Libraries

- `@untitledui/icons` - 1,100+ line-style icons (free)
- `@untitledui/file-icons` - File type icons
- `@untitledui-pro/icons` - 4,600+ icons in 4 styles (Requires PRO access)

### Import & Usage

```typescript
// Recommended: Named imports (tree-shakeable)
import { Home01, Settings01, ChevronDown } from "@untitledui/icons";

// Component props - pass as reference
<Button iconLeading={ChevronDown}>Options</Button>

// Standalone usage
<Home01 className="size-5 text-gray-600" />

// As JSX element - MUST include data-icon
<Button iconLeading={<ChevronDown data-icon className="size-4" />}>Options</Button>
```

### Styling

```typescript
// Size: use size-4 (16px), size-5 (20px), size-6 (24px)
<Home01 className="size-5" />

// Color: use semantic text colors
<Home01 className="size-5 text-brand-600" />

// Stroke width (line icons only)
<Home01 className="size-5" strokeWidth={2} />

// Accessibility: decorative icons need aria-hidden
<Home01 className="size-5" aria-hidden="true" />
```

### PRO Icon Styles

```typescript
import { Home01 } from "@untitledui-pro/icons";
// Line
import { Home01 } from "@untitledui-pro/icons/duocolor";
import { Home01 } from "@untitledui-pro/icons/duotone";
import { Home01 } from "@untitledui-pro/icons/solid";
```

## Form Handling

### Form Components

- `Input` - Text inputs with validation
- `Select` - Dropdown selections
- `Checkbox`, `Radio` - Selection controls
- `Textarea` - Multi-line text input
- `Form` - Form wrapper with validation

## Animation and Interactions

### Animation Libraries

- `motion` (Framer Motion) for complex animations
- `tailwindcss-animate` for utility-based animations
- CSS transitions for simple state changes

### CSS Transitions

For default small transition actions (hover states, color changes, etc.), use:

```typescript
className = "transition duration-100 ease-linear";
```

This provides a snappy 100ms linear transition that feels responsive without being jarring.

### Loading States

- Components support `isLoading` prop
- Built-in loading spinners
- Proper disabled states during loading

### Disabled states

All components use `opacity-50` for disabled states instead of individual disabled color tokens:

```typescript
// Correct (v8)
"disabled:cursor-not-allowed disabled:opacity-50"

// Incorrect (v7 pattern, do not use)
"disabled:bg-disabled_subtle disabled:text-disabled disabled:ring-disabled"
```

## Common Patterns

### Compound Components

```typescript
const Select = SelectComponent as typeof SelectComponent & {
    Item: typeof SelectItem;
    ComboBox: typeof ComboBox;
};
Select.Item = SelectItem;
Select.ComboBox = ComboBox;
```

### Conditional Rendering

```typescript
{label && <Label isRequired={isRequired}>{label}</Label>}
{hint && <HintText isInvalid={isInvalid}>{hint}</HintText>}
```

## State Management

### Component State

- Use React Aria's built-in state management
- Local state for component-specific data
- Context for shared component state (theme, router)

### Global State

- Theme context in `src/providers/theme.tsx`
- Router context in `src/providers/router-provider.tsx`

## Key Files and Utilities

### Core Utilities

- `src/utils/cx.ts` - Class name utilities
- `src/utils/is-react-component.ts` - Component type checking
- `src/hooks/` - Custom React hooks

### Style Configuration

- `src/styles/globals.css` - Global styles
- `src/styles/theme.css` - Theme definitions
- `src/styles/typography.css` - Typography styles

## Best Practices for AI Assistance

### When Adding New Components

1. Follow the existing component structure
2. Use React Aria Components as foundation
3. Implement proper TypeScript types
4. Add size and color variants where applicable
5. Include accessibility features
6. Follow the naming conventions
7. Add components to appropriate folders (`base/`, `application/`, etc.)

## Most Used Components Reference

### Button

The Button component is the most frequently used interactive element across the library.

**Import:**

```typescript
import { Button } from "@/components/base/buttons/button";
```

**Common Props:**

- `size`: `"xs" | "sm" | "md" | "lg" | "xl"` - Button size (default: `"sm"`)
- `color`: `"primary" | "secondary" | "tertiary" | "link-gray" | "link-color" | "primary-destructive" | "secondary-destructive" | "tertiary-destructive" | "link-destructive"` - Button color variant (default: `"primary"`)
- `iconLeading`: `FC | ReactNode` - Icon or component to display before text
- `iconTrailing`: `FC | ReactNode` - Icon or component to display after text
- `isDisabled`: `boolean` - Disabled state
- `isLoading`: `boolean` - Loading state with spinner
- `showTextWhileLoading`: `boolean` - Keep text visible during loading
- `children`: `ReactNode` - Button content

**Examples:**

```typescript
// Basic button
<Button size="md">Save</Button>

// With leading icon
<Button iconLeading={Check} color="primary">Save</Button>

// Loading state
<Button isLoading showTextWhileLoading>Submitting...</Button>

// Destructive action
<Button color="primary-destructive" iconLeading={Trash02}>Delete</Button>
```

### Input

Text input component with extensive customization options.

**Import:**

```typescript
import { Input } from "@/components/base/input/input";
import { InputGroup } from "@/components/base/input/input-group";
```

**Common Props:**

- `size`: `"sm" | "md" | "lg"` - Input size (default: `"md"`)
- `label`: `string` - Field label
- `placeholder`: `string` - Placeholder text
- `hint`: `string` - Helper text below input
- `tooltip`: `string` - Tooltip text for help icon
- `icon`: `FC` - Leading icon component
- `isRequired`: `boolean` - Required field indicator
- `isDisabled`: `boolean` - Disabled state
- `isInvalid`: `boolean` - Error state

**Examples:**

```typescript
// Basic input with label
<Input label="Email" placeholder="olivia@untitledui.com" />

// With icon and validation
<Input
  icon={Mail01}
  label="Email"
  isRequired
  isInvalid
  hint="Please enter a valid email"
/>

// Input group with button
<InputGroup label="Website" trailingAddon={<Button>Copy</Button>}>
  <InputBase placeholder="www.untitledui.com" />
</InputGroup>
```

### Select

Dropdown selection component with search and multi-select capabilities.

**Import:**

```typescript
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
```

**Common Props:**

- `size`: `"sm" | "md" | "lg"` - Select size (default: `"md"`)
- `label`: `string` - Field label
- `placeholder`: `string` - Placeholder text
- `hint`: `string` - Helper text
- `tooltip`: `string` - Tooltip text
- `items`: `Array` - Data items to display
- `isRequired`: `boolean` - Required field
- `isDisabled`: `boolean` - Disabled state
- `icon`: `FC | ReactNode` - Icon for placeholder

**Item Props:**

- `id`: `string` - Unique identifier
- `supportingText`: `string` - Secondary text
- `icon`: `FC | ReactNode` - Leading icon
- `avatarUrl`: `string` - Avatar image URL
- `isDisabled`: `boolean` - Disabled item

**Examples:**

```typescript
// Basic select
<Select label="Team member" placeholder="Select member" items={users}>
  {(item) => (
    <Select.Item id={item.id} supportingText={item.email}>
      {item.name}
    </Select.Item>
  )}
</Select>

// With search (ComboBox)
<Select.ComboBox label="Search" placeholder="Search users" items={users}>
  {(item) => <Select.Item id={item.id}>{item.name}</Select.Item>}
</Select.ComboBox>

// With avatars
<Select items={users} icon={User01}>
  {(item) => (
    <Select.Item avatarUrl={item.avatar} supportingText={item.role}>
      {item.name}
    </Select.Item>
  )}
</Select>
```

### Checkbox

Checkbox component for boolean selections.

**Import:**

```typescript
import { Checkbox } from "@/components/base/checkbox/checkbox";
```

**Common Props:**

- `size`: `"sm" | "md"` - Checkbox size (default: `"sm"`)
- `label`: `string` - Checkbox label
- `hint`: `string` - Helper text below label
- `isSelected`: `boolean` - Checked state
- `isDisabled`: `boolean` - Disabled state
- `isIndeterminate`: `boolean` - Indeterminate state

**Examples:**

```typescript
// Basic checkbox
<Checkbox label="Remember me" />

// With hint text
<Checkbox
  label="Remember me"
  hint="Save my login details for next time"
/>

// Controlled state
<Checkbox isSelected={checked} onChange={setChecked} />
```

### Badge

Badge components for status indicators and labels.

**Import:**

```typescript
import { Badge, BadgeWithDot, BadgeWithIcon } from "@/components/base/badges/badges";
```

**Common Props:**

- `size`: `"sm" | "md" | "lg"` - Badge size
- `color`: `"gray" | "brand" | "error" | "warning" | "success" | "slate" | "sky" | "blue" | "indigo" | "purple" | "pink" | "rose" | "orange"` - Color theme
- `type`: `"pill-color" | "color" | "modern"` - Badge style variant

**Examples:**

```typescript
// Basic badge
<Badge color="brand" size="md">New</Badge>

// With dot indicator
<BadgeWithDot color="success" type="pill-color">Active</BadgeWithDot>

// With icon
<BadgeWithIcon iconLeading={ArrowUp} color="success">12%</BadgeWithIcon>
```

### Avatar

Avatar component for user profile images.

**Import:**

```typescript
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
```

**Common Props:**

- `size`: `"xs" | "sm" | "md" | "lg" | "xl" | "2xl"` - Avatar size (note: `"xxs"` was removed in v8)
- `src`: `string` - Image URL
- `alt`: `string` - Alt text for accessibility
- `initials`: `string` - Text initials when no image
- `icon`: `FC` - Icon when no image
- `status`: `"online" | "offline"` - Status indicator
- `verified`: `boolean` - Verification badge
- `badge`: `ReactNode` - Custom badge element

**Examples:**

```typescript
// Basic avatar
<Avatar src="/avatar.jpg" alt="User Name" size="md" />

// With status
<Avatar src="/avatar.jpg" status="online" />

// With initials fallback
<Avatar initials="OR" size="lg" />

// Label group
<AvatarLabelGroup
  src="/avatar.jpg"
  title="Olivia Rhye"
  subtitle="olivia@untitledui.com"
  size="md"
/>
```

### FeaturedIcon

Decorative icon component with themed backgrounds for emphasis and visual hierarchy.

**Import:**

```typescript
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
```

**Common Props:**

- `icon`: `FC` - Icon component to display (required)
- `size`: `"sm" | "md" | "lg" | "xl"` - Icon container size
- `color`: `"brand" | "gray" | "error" | "warning" | "success"` - Color scheme
- `theme`: `"light" | "gradient" | "dark" | "modern" | "modern-neue" | "outline"` - Visual theme style

**Theme Styles:**

- `light`: Subtle background with colored icon
- `gradient`: Gradient background effect
- `dark`: Solid colored background with white icon
- `modern`: Contemporary gray styling (gray color only)
- `modern-neue`: Alternative modern style (gray color only)
- `outline`: Border style with transparent background

**Examples:**

```typescript
// Basic featured icon
<FeaturedIcon icon={CheckCircle} color="success" theme="light" size="lg" />

// With gradient theme
<FeaturedIcon icon={AlertCircle} color="warning" theme="gradient" size="xl" />

// Dark theme for emphasis
<FeaturedIcon icon={XCircle} color="error" theme="dark" size="md" />

// Outline style
<FeaturedIcon icon={InfoCircle} color="brand" theme="outline" size="lg" />

// Modern styles (IMPORTANT: gray only)
<FeaturedIcon icon={Settings} color="gray" theme="modern" size="lg" />
```

### Link

**Note**: There is no dedicated Link component. Instead, use the Button component with an `href` prop and link-specific color variants.

**Import:**

```typescript
import { Button } from "@/components/base/buttons/button";
```

**Link Colors:**

- `link-gray` - Gray link styling
- `link-color` - Brand color link styling
- `link-destructive` - Destructive link styling

**Examples:**

```typescript
// Basic link
<Button href="/dashboard" color="link-color">View Dashboard</Button>

// With icon
<Button href="/settings" color="link-gray" iconLeading={Settings01}>
  Settings
</Button>

// Destructive link
<Button href="/delete" color="link-destructive" iconLeading={Trash02}>
  Delete Account
</Button>

// External link
<Button href="https://example.com" color="link-color" iconTrailing={ExternalLink01}>
  Visit Site
</Button>
```

### Common Component Patterns

1. **Size Variants**: Most components support `sm`, `md`, `lg` sizes
2. **State Props**: `isDisabled`, `isLoading`, `isInvalid`, `isRequired` are common
3. **Icon Support**: Components accept icons as both components (`Icon`) or elements (`<Icon />`)
4. **Compound Components**: Complex components use dot notation (e.g., `Select.Item`, `Select.ComboBox`)
5. **Accessibility**: All components include proper ARIA attributes and keyboard support

### Icon Usage

When passing icons to components:

```typescript
// As component reference (preferred)
<Button iconLeading={ChevronDown}>Options</Button>

// As element (must include data-icon)
<Button iconLeading={<ChevronDown data-icon className="size-4" />}>Options</Button>
```

## COLORS

MUST use color classes to style elements.

Bad:

- text-gray-900
- text-gray-600
- bg-blue-700

Good:

- text-primary
- text-secondary
- bg-primary

### Text Color

Use text color variables to manage all text fill colors in your designs across light and dark modes.

| Name                       | Usage                                                                                                                                                                |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text-primary               | Primary text such as page headings.                                                                                                                                  |
| text-primary_on-brand      | Primary text when used on solid brand color backgrounds. Commonly used for brand theme website sections (e.g. CTA sections).                                         |
| text-secondary             | Secondary text such as labels and section headings.                                                                                                                  |
| text-secondary_hover       | Secondary text when in hover state.                                                                                                                                  |
| text-secondary_on-brand    | Secondary text when used on solid brand color backgrounds. Commonly used for brand theme website sections (e.g. CTA sections).                                       |
| text-tertiary              | Tertiary text such as supporting text and paragraph text.                                                                                                            |
| text-tertiary_hover        | Tertiary text when in hover state.                                                                                                                                   |
| text-tertiary_on-brand     | Tertiary text when used on solid brand color backgrounds. Commonly used for brand theme website sections (e.g. CTA sections).                                        |
| text-quaternary            | Quaternary text for more subtle and lower-contrast text, such as footer column headings.                                                                             |
| text-quaternary_on-brand   | Quaternary text when used on solid brand color backgrounds. Commonly used for brand theme website sections (e.g. footers).                                           |
| text-white                 | Text that is always white, regardless of the mode.                                                                                                                   |
| text-placeholder           | Default color for placeholder text such as input field placeholders. This can be changed to gray-400, but gray-500 is more accessible because it is higher contrast. |
| text-brand-primary         | Primary brand text useful for headings (e.g. cards in pricing page headers).                                                                                         |
| text-brand-secondary       | Secondary brand text for brand buttons, as well as accented text, highlights, and subheadings (e.g. subheadings in blog post cards).                                 |
| text-brand-secondary_hover | Secondary brand text when in hover state (e.g. brand buttons).                                                                                                       |
| text-brand-tertiary        | Tertiary brand text for lighter accented text and highlights (e.g. numbers in metric cards).                                                                         |
| text-brand-tertiary_alt    | An alternative to tertiary brand text that is lighter in dark mode (e.g. numbers in metric cards).                                                                   |
| text-error-primary         | Default error state semantic text color (e.g. input field error states).                                                                                             |
| text-warning-primary       | Default warning state semantic text color.                                                                                                                           |
| text-success-primary       | Default success state semantic text color.                                                                                                                           |

### Border Color

Use border color variables to manage all stroke colors in your designs across light and dark modes. You can use the same values for `ring-` and `outline-` as well (i.e. `ring-primary` `outline-secondary`).

| Name                 | Usage                                                                                                                                                                                   |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| border-primary       | High contrast borders. These are used for components such as input fields, button groups, and checkboxes.                                                                               |
| border-secondary     | Medium contrast borders. This is the most commonly used border color and is the default for most components (e.g. file uploaders), cards (such as tables), and content dividers.        |
| border-secondary_alt | An alternative to secondary border that uses alpha transparency. This is used exclusively for floating menus such as input dropdowns and notifications to create sharper bottom border. |
| border-tertiary      | Low contrast borders useful for very subtle dividers and borders such as line and bar chart axis dividers.                                                                              |
| border-brand         | Default brand border color. Useful for active states in components such as input fields.                                                                                                |
| border-brand_alt     | An brand border color that switches to gray when in dark mode. Useful for components such as brand-style variants of banners and footers.                                               |
| border-error         | Default error state semantic border color. Useful for error states in components such as input fields and file uploaders.                                                               |
| border-error_subtle  | A more subtle (lower contrast) alternative for error state semantic borders such as error state input fields.                                                                           |

### Foreground Color

Use foreground color variables to manage all non-text foreground elements in your designs across light and dark modes. Can be used via `text-`, `bg-`, `ring-`, `outline-`, `stroke-`, `fill-`, etc.

| Name                   | Usage                                                                                                                                                         |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fg-primary             | Highest contrast non-text foreground elements such as icons.                                                                                                  |
| fg-secondary           | High contrast non-text foreground elements such as icons.                                                                                                     |
| fg-secondary_hover     | Secondary foreground elements when in hover state.                                                                                                            |
| fg-tertiary            | Medium contrast non-text foreground elements such as icons.                                                                                                   |
| fg-tertiary_hover      | Tertiary foreground elements when in hover state.                                                                                                             |
| fg-quaternary          | Low contrast non-text foreground elements such as icons in buttons, help icons and icons used in input fields.                                                |
| fg-quaternary_hover    | Quaternary foreground elements when in hover state, such as help icons.                                                                                       |
| fg-white               | Foreground elements that are always white, regardless of the mode.                                                                                            |
| fg-brand-primary       | Primary brand color non-text foreground elements such as featured icons and progress bars.                                                                    |
| fg-brand-primary_alt   | An alternative for primary brand color non-text foreground elements that switches to gray when in dark mode such as active horizontal tabs.                   |
| fg-brand-secondary     | Secondary brand color non-text foreground elements such as accents and arrows in marketing site sections (e.g. hero header sections).                         |
| fg-brand-secondary_alt | An alternative for secondary brand color non-text foreground elements that switches to gray when in dark mode such as brand buttons.                          |
| fg-error-primary       | Primary error state color for non-text foreground elements such as featured icons.                                                                            |
| fg-error-secondary     | Secondary error state color for non-text foreground elements such as icons in error state input fields and negative metrics item charts and icons.            |
| fg-warning-primary     | Primary warning state color for non-text foreground elements such as featured icons.                                                                          |
| fg-warning-secondary   | Secondary warning state color for non-text foreground elements.                                                                                               |
| fg-success-primary     | Primary success state color for non-text foreground elements such as featured icons.                                                                          |
| fg-success-secondary   | Secondary success state color for non-text foreground elements such as button dots, avatar online indicator dots, and positive metrics item charts and icons. |

### Background Color

Use background color variables to manage all fill colors for elements in your designs across light and dark modes.

| Name                    | Usage                                                                                                                                                                                         |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bg-primary              | The primary background color (white) used across all layouts and components.                                                                                                                  |
| bg-primary_alt          | An alternative primary background color (white) that switches to bg-secondary when in dark mode.                                                                                              |
| bg-primary_hover        | Primary background hover color. This acts as the default hover state background color for components with white backgrounds (e.g. input dropdown menu items).                                 |
| bg-primary-solid        | The primary dark background color used across layouts and components. This switches to bg-secondary when in dark mode and is useful for components such as tooltips and Text editor tooltips. |
| bg-secondary            | The secondary background color used to create contrast against white backgrounds, such as website section backgrounds.                                                                        |
| bg-secondary_alt        | An alternative secondary background color that switches to bg-primary when in dark mode. Useful for components such as border-style horizontal tabs.                                          |
| bg-secondary_hover      | Secondary background hover color. Useful for hover states for components with gray-50 backgrounds such as active states (e.g. navigation items and date pickers).                             |
| bg-secondary_subtle     | An alternative secondary background color that is slightly lighter and more subtle in light mode. This is useful for components such as banners.                                              |
| bg-secondary-solid      | The secondary dark background color used across layouts and components. This is useful for components such as featured icons.                                                                 |
| bg-tertiary             | The tertiary background color used to create contrast against light backgrounds such as toggles.                                                                                              |
| bg-quaternary           | The quaternary background color used to create contrast against light backgrounds, such as sliders and progress bars.                                                                         |
| bg-active               | Default active background color for components such as selected menu items in input dropdowns.                                                                                                |
| bg-overlay              | Default background color for background overlays. These are useful for overlay components such as modals.                                                                                     |
| bg-brand-primary        | The primary brand background color. Useful for components such as check icons.                                                                                                                |
| bg-brand-primary_alt    | An alternative primary brand background color that switches to bg-secondary when in dark mode. Useful for components such as active horizontal tabs.                                          |
| bg-brand-secondary      | The secondary brand background color. Useful for components such as featured icons.                                                                                                           |
| bg-brand-solid          | Default solid (dark) brand background color. Useful for components such as toggles and messages.                                                                                              |
| bg-brand-solid_hover    | Solid brand background color when in hover state. Useful for components such as toggles.                                                                                                      |
| bg-brand-section        | This is the default dark brand color background used for website sections such as CTA sections and testimonials. Switches to bg-secondary when in dark mode.                                  |
| bg-brand-section_subtle | An alternative brand section background color to provide contrast for website sections such as FAQ sections. Switches to bg-primary when in dark mode.                                        |
| bg-error-primary        | Primary error state background color for components such as buttons.                                                                                                                          |
| bg-error-secondary      | Secondary error state background color for components such as featured icons.                                                                                                                 |
| bg-error-solid          | Default solid (dark) error state background color for components such as buttons, featured icons and metric items.                                                                            |
| bg-error-solid_hover    | Default solid (dark) error hover state background color for components such as buttons.                                                                                                       |
| bg-warning-primary      | Primary warning state background color for components.                                                                                                                                        |
| bg-warning-secondary    | Secondary warning state background color for components such as featured icons.                                                                                                               |
| bg-warning-solid        | Default solid (dark) warning state background color for components such as featured icons.                                                                                                    |
| bg-success-primary      | Primary success state background color for components.                                                                                                                                        |
| bg-success-secondary    | Secondary success state background color for components such as featured icons.                                                                                                               |
| bg-success-solid        | Default solid (dark) success state background color for components such as featured icons and metric items.                                                                                   |
