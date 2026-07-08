import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
    text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
    text("created_at")
        .notNull()
        .default(sql`(datetime('now'))`);

export const goals = sqliteTable("goals", {
    id: id(),
    title: text("title").notNull(),
    why: text("why"),
    targetDate: text("target_date"), // YYYY-MM-DD
    status: text("status", { enum: ["active", "completed", "paused"] })
        .notNull()
        .default("active"),
    createdAt: createdAt(),
});

export const milestones = sqliteTable(
    "milestones",
    {
        id: id(),
        goalId: text("goal_id")
            .notNull()
            .references(() => goals.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        dueDate: text("due_date"), // YYYY-MM-DD
        done: integer("done", { mode: "boolean" }).notNull().default(false),
        sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [index("milestones_goal_idx").on(t.goalId)],
);

export const habits = sqliteTable(
    "habits",
    {
        id: id(),
        title: text("title").notNull(),
        // Days of week the habit is due, 0 = Sunday … 6 = Saturday. All 7 = daily.
        daysOfWeek: text("days_of_week", { mode: "json" })
            .$type<number[]>()
            .notNull()
            .default(sql`'[0,1,2,3,4,5,6]'`),
        timeOfDay: text("time_of_day", { enum: ["morning", "afternoon", "evening", "anytime"] })
            .notNull()
            .default("anytime"),
        // Optional exact schedule as "HH:MM" (24h). Drives the time range shown on the Today panel.
        startTime: text("start_time"),
        endTime: text("end_time"),
        // Free-text grouping label for the Today panel (e.g. "Trading", "Life Style").
        category: text("category").notNull().default("General"),
        goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
        archived: integer("archived", { mode: "boolean" }).notNull().default(false),
        createdAt: createdAt(),
    },
    (t) => [index("habits_goal_idx").on(t.goalId)],
);

export const habitLogs = sqliteTable(
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

export const routines = sqliteTable("routines", {
    id: id(),
    name: text("name").notNull(),
    timeWindow: text("time_window", { enum: ["morning", "afternoon", "evening"] })
        .notNull()
        .default("morning"),
    daysOfWeek: text("days_of_week", { mode: "json" })
        .$type<number[]>()
        .notNull()
        .default(sql`'[0,1,2,3,4,5,6]'`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
});

export const routineItems = sqliteTable(
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

export const tasks = sqliteTable(
    "tasks",
    {
        id: id(),
        title: text("title").notNull(),
        goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
        milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
        dueDate: text("due_date"), // YYYY-MM-DD
        done: integer("done", { mode: "boolean" }).notNull().default(false),
        createdAt: createdAt(),
    },
    (t) => [index("tasks_goal_idx").on(t.goalId), index("tasks_due_idx").on(t.dueDate)],
);

// Persisted assistant conversation. One row per turn; `content` holds the
// Anthropic content blocks (text/tool_use/tool_result) as JSON so tool activity
// survives a reload and can be replayed to the model on the next turn.
export const chatMessages = sqliteTable(
    "chat_messages",
    {
        id: id(),
        role: text("role", { enum: ["user", "assistant"] }).notNull(),
        content: text("content", { mode: "json" }).$type<unknown>().notNull(),
        createdAt: createdAt(),
    },
    (t) => [index("chat_messages_created_idx").on(t.createdAt)],
);

// One rich-text journal entry per calendar day. `content` holds a TipTap JSON doc.
export const dailyNotes = sqliteTable(
    "daily_notes",
    {
        id: id(),
        date: text("date").notNull(), // YYYY-MM-DD (local)
        content: text("content", { mode: "json" }).$type<unknown>(),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (t) => [uniqueIndex("daily_notes_date_idx").on(t.date)],
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

export type TimeOfDay = Habit["timeOfDay"];
export type TimeWindow = Routine["timeWindow"];
