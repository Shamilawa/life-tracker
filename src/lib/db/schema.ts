import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () =>
    text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
    timestamp("created_at", { mode: "string" })
        .notNull()
        .default(sql`now()`);

export const goals = pgTable("goals", {
    id: id(),
    title: text("title").notNull(),
    why: text("why"),
    targetDate: text("target_date"), // YYYY-MM-DD
    status: text("status", { enum: ["active", "completed", "paused"] })
        .notNull()
        .default("active"),
    createdAt: createdAt(),
});

export const milestones = pgTable(
    "milestones",
    {
        id: id(),
        goalId: text("goal_id")
            .notNull()
            .references(() => goals.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        dueDate: text("due_date"), // YYYY-MM-DD
        done: boolean("done").notNull().default(false),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [index("milestones_goal_idx").on(t.goalId)],
);

export const habits = pgTable(
    "habits",
    {
        id: id(),
        title: text("title").notNull(),
        // Days of week the habit is due, 0 = Sunday … 6 = Saturday. All 7 = daily.
        daysOfWeek: jsonb("days_of_week")
            .$type<number[]>()
            .notNull()
            .default(sql`'[0,1,2,3,4,5,6]'::jsonb`),
        timeOfDay: text("time_of_day", { enum: ["morning", "afternoon", "evening", "anytime"] })
            .notNull()
            .default("anytime"),
        // Optional exact schedule as "HH:MM" (24h). Drives the time range shown on the Today panel.
        startTime: text("start_time"),
        endTime: text("end_time"),
        // Free-text grouping label for the Today panel (e.g. "Trading", "Life Style").
        category: text("category").notNull().default("General"),
        goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
        archived: boolean("archived").notNull().default(false),
        createdAt: createdAt(),
    },
    (t) => [index("habits_goal_idx").on(t.goalId)],
);

export const habitLogs = pgTable(
    "habit_logs",
    {
        id: id(),
        habitId: text("habit_id")
            .notNull()
            .references(() => habits.id, { onDelete: "cascade" }),
        date: text("date").notNull(), // YYYY-MM-DD (local)
        status: text("status", { enum: ["done", "skipped"] }).notNull(),
        note: text("note"),
    },
    (t) => [uniqueIndex("habit_logs_habit_date_idx").on(t.habitId, t.date), index("habit_logs_date_idx").on(t.date)],
);

export const routines = pgTable("routines", {
    id: id(),
    name: text("name").notNull(),
    timeWindow: text("time_window", { enum: ["morning", "afternoon", "evening"] })
        .notNull()
        .default("morning"),
    daysOfWeek: jsonb("days_of_week")
        .$type<number[]>()
        .notNull()
        .default(sql`'[0,1,2,3,4,5,6]'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
});

export const routineItems = pgTable(
    "routine_items",
    {
        id: id(),
        routineId: text("routine_id")
            .notNull()
            .references(() => routines.id, { onDelete: "cascade" }),
        habitId: text("habit_id")
            .notNull()
            .references(() => habits.id, { onDelete: "cascade" }),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [
        index("routine_items_routine_idx").on(t.routineId),
        uniqueIndex("routine_items_routine_habit_idx").on(t.routineId, t.habitId),
    ],
);

export const tasks = pgTable(
    "tasks",
    {
        id: id(),
        title: text("title").notNull(),
        goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
        milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
        dueDate: text("due_date"), // YYYY-MM-DD
        dueTime: text("due_time"), // optional "HH:MM" (24h, local) — drives the 15-min-before Telegram reminder
        done: boolean("done").notNull().default(false),
        reminderSentAt: timestamp("reminder_sent_at", { mode: "string" }), // set once the due-soon Telegram reminder fires, so cron ticks don't resend
        createdAt: createdAt(),
    },
    (t) => [index("tasks_goal_idx").on(t.goalId), index("tasks_due_idx").on(t.dueDate)],
);

// Persisted assistant conversation. One row per turn; `content` holds the
// Anthropic content blocks (text/tool_use/tool_result) as JSON so tool activity
// survives a reload and can be replayed to the model on the next turn.
export const chatMessages = pgTable(
    "chat_messages",
    {
        id: id(),
        role: text("role", { enum: ["user", "assistant"] }).notNull(),
        content: jsonb("content").$type<unknown>().notNull(),
        createdAt: createdAt(),
    },
    (t) => [index("chat_messages_created_idx").on(t.createdAt)],
);

// One rich-text journal entry per calendar day. `content` holds a TipTap JSON doc.
export const dailyNotes = pgTable(
    "daily_notes",
    {
        id: id(),
        date: text("date").notNull(), // YYYY-MM-DD (local)
        content: jsonb("content").$type<unknown>(),
        updatedAt: timestamp("updated_at", { mode: "string" })
            .notNull()
            .default(sql`now()`),
    },
    (t) => [uniqueIndex("daily_notes_date_idx").on(t.date)],
);

// Proactive assistant output — twice-daily generated briefings today, more
// signal kinds later. `dismissedAt` null = unseen; set once, never re-cleared.
export const assistantSignals = pgTable(
    "assistant_signals",
    {
        id: id(),
        kind: text("kind", { enum: ["briefing_morning", "briefing_evening"] }).notNull(),
        title: text("title").notNull(),
        body: text("body").notNull(),
        createdAt: createdAt(),
        dismissedAt: timestamp("dismissed_at", { mode: "string" }),
    },
    (t) => [index("assistant_signals_created_idx").on(t.createdAt)],
);

// Single global row (no per-user keying — single-user app). Shapes tone/focus
// across web chat, Telegram, and briefings.
export const assistantPreferences = pgTable("assistant_preferences", {
    id: id(),
    tone: text("tone", { enum: ["concise", "detailed"] }).notNull().default("concise"),
    focus: text("focus"),
    mutedTopics: jsonb("muted_topics").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().default(sql`now()`),
});

// Deterministic "needs attention" tracking, independent of the prose briefings in
// assistantSignals. syncFlags() (flags.ts) opens/updates/resolves these on every
// briefing generation and every get_flags tool call — resolvedAt is set the moment
// a flag's underlying condition stops recurring, so closure needs no explicit action.
export const assistantFlags = pgTable(
    "assistant_flags",
    {
        id: id(),
        type: text("type", { enum: ["habit_at_risk", "task_overdue", "goal_deadline_risk"] }).notNull(),
        refId: text("ref_id").notNull(),
        refTitle: text("ref_title").notNull(), // snapshot at flag time; not re-joined on read
        firstSeenAt: timestamp("first_seen_at", { mode: "string" }).notNull().default(sql`now()`),
        lastSeenAt: timestamp("last_seen_at", { mode: "string" }).notNull().default(sql`now()`),
        resolvedAt: timestamp("resolved_at", { mode: "string" }),
        suggestionDismissedAt: timestamp("suggestion_dismissed_at", { mode: "string" }),
    },
    (t) => [index("assistant_flags_type_ref_idx").on(t.type, t.refId), index("assistant_flags_resolved_idx").on(t.resolvedAt)],
);

export const goalsRelations = relations(goals, ({ many }) => ({
    milestones: many(milestones),
    habits: many(habits),
    tasks: many(tasks),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
    goal: one(goals, { fields: [milestones.goalId], references: [goals.id] }),
    tasks: many(tasks),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
    goal: one(goals, { fields: [habits.goalId], references: [goals.id] }),
    logs: many(habitLogs),
    routineItems: many(routineItems),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
    habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
}));

export const routinesRelations = relations(routines, ({ many }) => ({
    items: many(routineItems),
}));

export const routineItemsRelations = relations(routineItems, ({ one }) => ({
    routine: one(routines, { fields: [routineItems.routineId], references: [routines.id] }),
    habit: one(habits, { fields: [routineItems.habitId], references: [habits.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    goal: one(goals, { fields: [tasks.goalId], references: [goals.id] }),
    milestone: one(milestones, { fields: [tasks.milestoneId], references: [milestones.id] }),
}));

export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineItem = typeof routineItems.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type DailyNote = typeof dailyNotes.$inferSelect;
export type AssistantSignal = typeof assistantSignals.$inferSelect;
export type AssistantFlag = typeof assistantFlags.$inferSelect;

export type TimeOfDay = Habit["timeOfDay"];
export type TimeWindow = Routine["timeWindow"];
export type SignalKind = AssistantSignal["kind"];
export type FlagType = AssistantFlag["type"];
