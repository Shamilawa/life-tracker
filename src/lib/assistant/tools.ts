import type OpenAI from "openai";
import { addDays, subDays } from "date-fns";
import { and, eq } from "drizzle-orm";
import {
    addMilestone,
    createGoal,
    createHabit,
    createTask,
    setHabitLog,
    toggleTask,
} from "@/lib/actions";
import { db } from "@/lib/db";
import { goals, habits, tasks } from "@/lib/db/schema";
import type { TimeOfDay } from "@/lib/db/schema";
import { dateStr, daysLabel, todayStr } from "@/lib/dates";
import { getGoalsWithProgress, getHabitsWithStats, getInsights, getRoutinesWithHabits, getTodayView } from "@/lib/queries";

// ---- Tool definitions ----
// Descriptions are prescriptive about WHEN to call each tool, and the write tools
// are told to match names loosely — the model reaches for tools more reliably when
// the trigger conditions are spelled out.

type ToolSpec = { name: string; description: string; parameters: Record<string, unknown> };

const specs: ToolSpec[] = [
    {
        name: "get_today",
        description:
            "Get today's habits grouped by routine, how many are done vs due, and the tasks due today. Call this whenever the user asks what they should do today, how their day is going, what's left, or anything about the current day.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "get_habits",
        description:
            "List every active habit with its schedule, current streak, and 30-day consistency percentage. Call this when the user asks about their habits, streaks, consistency, or which habits are slipping.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "get_goals",
        description:
            "List goals with status, progress percentage, milestones, and the consistency of linked habits. Call this when the user asks about goals, progress toward a goal, milestones, or whether they are on track.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "get_routines",
        description: "List routines with their time window, days, and the habits in each. Call this when the user asks about their routines or daily structure.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "get_insights",
        description:
            "Get overall stats: habit completion rate for the last 7 and 30 days, the best current streak, and the number of active goals. Call this when the user asks how they are doing overall, for a summary, or for trends.",
        parameters: { type: "object", properties: {} },
    },
    {
        name: "log_habit",
        description:
            "Mark a habit as done, skipped, or clear its log for a given day. Call this when the user says they did, completed, finished, skipped, or missed a habit (e.g. 'I did my workout', 'skip reading today', 'undo my run'). Match habit_name loosely against the user's habits.",
        parameters: {
            type: "object",
            properties: {
                habit_name: { type: "string", description: "Name of the habit, matched loosely against existing habits." },
                status: { type: "string", enum: ["done", "skipped", "clear"], description: "'done' to complete, 'skipped' to skip, 'clear' to remove an existing log (undo)." },
                date: { type: "string", description: "'today' (default), 'yesterday', or an explicit YYYY-MM-DD date." },
            },
            required: ["habit_name", "status"],
        },
    },
    {
        name: "create_habit",
        description:
            "Create a new habit. Call this when the user wants to start tracking a new habit. Confirm the details you inferred in your reply.",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "The habit name, e.g. 'Read 20 pages'." },
                frequency: { type: "string", enum: ["daily", "weekdays", "weekends"], description: "Shortcut for the schedule. Use days_of_week instead for specific days." },
                days_of_week: { type: "array", items: { type: "integer" }, description: "Specific days as integers where 0=Sunday … 6=Saturday. Overrides frequency." },
                time_of_day: { type: "string", enum: ["morning", "afternoon", "evening", "anytime"], description: "When the habit is done. Defaults to 'anytime'." },
                start_time: { type: "string", description: "Optional exact start time as 'HH:MM' (24h), e.g. '06:00'." },
                end_time: { type: "string", description: "Optional exact end time as 'HH:MM' (24h), e.g. '06:30'." },
                category: { type: "string", description: "Optional grouping label for the Today page, e.g. 'Trading' or 'Life Style'. Defaults to 'General'." },
                goal_name: { type: "string", description: "Optional goal to link this habit to, matched loosely against existing goals." },
            },
            required: ["title"],
        },
    },
    {
        name: "create_task",
        description: "Create a one-off task. Call this when the user mentions a to-do, reminder, or something they need to get done (not a recurring habit).",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "The task description." },
                due_date: { type: "string", description: "'today', 'tomorrow', or a YYYY-MM-DD date. Optional." },
                goal_name: { type: "string", description: "Optional goal to link the task to, matched loosely." },
            },
            required: ["title"],
        },
    },
    {
        name: "complete_task",
        description: "Mark an existing open task as done. Call this when the user says they finished or completed a task. Match task_name loosely against their open tasks.",
        parameters: {
            type: "object",
            properties: { task_name: { type: "string", description: "Name of the task, matched loosely against open tasks." } },
            required: ["task_name"],
        },
    },
    {
        name: "create_goal",
        description: "Create a new goal. Call this when the user wants to set a new long-term goal or objective.",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "The goal." },
                why: { type: "string", description: "Optional — why the goal matters to them." },
                target_date: { type: "string", description: "Optional target date as YYYY-MM-DD." },
            },
            required: ["title"],
        },
    },
    {
        name: "add_milestone",
        description: "Add a milestone to an existing goal. Call this when the user wants to break a goal into steps or add a checkpoint.",
        parameters: {
            type: "object",
            properties: {
                goal_name: { type: "string", description: "The goal to add the milestone to, matched loosely." },
                title: { type: "string", description: "The milestone." },
                due_date: { type: "string", description: "Optional due date as YYYY-MM-DD." },
            },
            required: ["goal_name", "title"],
        },
    },
];

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = specs.map((s) => ({
    type: "function",
    function: { name: s.name, description: s.description, parameters: s.parameters },
}));

// ---- Helpers ----

function resolveDate(input: string | undefined | null, fallback: string | null = null): string | null {
    if (!input) return fallback;
    const s = input.trim().toLowerCase();
    if (s === "today") return todayStr();
    if (s === "tomorrow") return dateStr(addDays(new Date(), 1));
    if (s === "yesterday") return dateStr(subDays(new Date(), 1));
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return fallback;
}

function findByName<T>(query: string, items: T[], getName: (t: T) => string): T | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const exact = items.find((i) => getName(i).toLowerCase() === q);
    if (exact) return exact;
    const matches = items.filter((i) => {
        const name = getName(i).toLowerCase();
        return name.includes(q) || q.includes(name);
    });
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return matches.find((i) => getName(i).toLowerCase().startsWith(q)) ?? matches[0];
    return null;
}

function frequencyToDays(frequency?: string, daysOfWeek?: number[]): number[] {
    if (daysOfWeek && daysOfWeek.length) return [...new Set(daysOfWeek.filter((d) => d >= 0 && d <= 6))];
    if (frequency === "weekdays") return [1, 2, 3, 4, 5];
    if (frequency === "weekends") return [0, 6];
    return [0, 1, 2, 3, 4, 5, 6];
}

// ---- Executor ----
// Read tools return compact JSON; write tools return a short confirmation the
// model can quote back, or a helpful error listing valid names so it can retry.

type ToolInput = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function executeTool(name: string, input: ToolInput): Promise<string> {
    switch (name) {
        case "get_today": {
            const t = await getTodayView();
            return JSON.stringify({
                date: t.date,
                habits_done: t.doneCount,
                habits_due: t.dueCount,
                routines: t.routineGroups.map((g) => ({
                    routine: g.routine.name,
                    time: g.routine.timeWindow,
                    habits: g.habits.map((h) => ({ name: h.title, status: h.todayLog?.status ?? "pending" })),
                })),
                other_habits: t.unroutined.flatMap((u) => u.habits.map((h) => ({ name: h.title, time: u.timeOfDay, status: h.todayLog?.status ?? "pending" }))),
                tasks_due_today: t.tasksDue.map((k) => k.title),
                overdue_tasks: t.overdueTasks.map((k) => k.title),
            });
        }
        case "get_habits": {
            const stats = await getHabitsWithStats();
            return JSON.stringify(
                stats.map((s) => ({
                    name: s.habit.title,
                    schedule: daysLabel(s.habit.daysOfWeek),
                    time_of_day: s.habit.timeOfDay,
                    current_streak_days: s.currentStreak,
                    consistency_30d_percent: s.consistency30,
                    linked_goal: s.goalTitle,
                })),
            );
        }
        case "get_goals": {
            const gs = await getGoalsWithProgress();
            return JSON.stringify(
                gs.map((g) => ({
                    title: g.goal.title,
                    status: g.goal.status,
                    progress_percent: g.progress,
                    target_date: g.goal.targetDate,
                    milestones: g.milestones.map((m) => ({ title: m.title, done: m.done, due: m.dueDate })),
                    linked_habits: g.linkedHabits.map((h) => h.title),
                    linked_habit_consistency_30d: g.habitConsistency30,
                    open_tasks: g.openTasks.map((k) => k.title),
                })),
            );
        }
        case "get_routines": {
            const rs = await getRoutinesWithHabits();
            return JSON.stringify(
                rs.map((r) => ({ name: r.name, time_window: r.timeWindow, days: daysLabel(r.daysOfWeek), habits: r.habits.map((h) => h.title) })),
            );
        }
        case "get_insights": {
            const i = await getInsights();
            return JSON.stringify({
                completion_last_7_days_percent: i.completion7,
                completion_last_30_days_percent: i.completion30,
                best_current_streak: i.bestStreak,
                active_goals: i.activeGoals,
            });
        }
        case "log_habit": {
            const habitName = str(input.habit_name);
            const status = str(input.status);
            if (!habitName || !status) return "Error: habit_name and status are required.";
            const active = await db.select().from(habits).where(eq(habits.archived, false));
            const match = findByName(habitName, active, (h) => h.title);
            if (!match) return `No habit matches "${habitName}". Active habits: ${active.map((h) => h.title).join(", ") || "none"}.`;
            const date = resolveDate(str(input.date), todayStr())!;
            const logStatus = status === "clear" ? null : (status as "done" | "skipped");
            await setHabitLog(match.id, date, logStatus);
            const verb = logStatus === "done" ? "marked done" : logStatus === "skipped" ? "skipped" : "cleared";
            return `"${match.title}" ${verb} for ${date}.`;
        }
        case "create_habit": {
            const title = str(input.title);
            if (!title) return "Error: title is required.";
            let goalId: string | null = null;
            const goalName = str(input.goal_name);
            if (goalName) {
                const activeGoals = await db.select().from(goals).where(eq(goals.status, "active"));
                goalId = findByName(goalName, activeGoals, (g) => g.title)?.id ?? null;
            }
            const daysOfWeek = frequencyToDays(str(input.frequency), Array.isArray(input.days_of_week) ? (input.days_of_week as number[]) : undefined);
            const timeOfDay = (str(input.time_of_day) as TimeOfDay) ?? "anytime";
            await createHabit({
                title,
                daysOfWeek,
                timeOfDay,
                startTime: str(input.start_time) ?? null,
                endTime: str(input.end_time) ?? null,
                category: str(input.category)?.trim() || "General",
                goalId,
            });
            return `Created habit "${title}" (${daysLabel(daysOfWeek)}, ${timeOfDay}).`;
        }
        case "create_task": {
            const title = str(input.title);
            if (!title) return "Error: title is required.";
            let goalId: string | null = null;
            const goalName = str(input.goal_name);
            if (goalName) {
                const activeGoals = await db.select().from(goals).where(eq(goals.status, "active"));
                goalId = findByName(goalName, activeGoals, (g) => g.title)?.id ?? null;
            }
            const dueDate = resolveDate(str(input.due_date));
            await createTask(title, goalId, dueDate);
            return `Created task "${title}"${dueDate ? ` due ${dueDate}` : ""}.`;
        }
        case "complete_task": {
            const taskName = str(input.task_name);
            if (!taskName) return "Error: task_name is required.";
            const open = await db.select().from(tasks).where(eq(tasks.done, false));
            const match = findByName(taskName, open, (k) => k.title);
            if (!match) return `No open task matches "${taskName}". Open tasks: ${open.map((k) => k.title).join(", ") || "none"}.`;
            await toggleTask(match.id, true);
            return `Completed task "${match.title}".`;
        }
        case "create_goal": {
            const title = str(input.title);
            if (!title) return "Error: title is required.";
            await createGoal({ title, why: str(input.why) ?? null, targetDate: resolveDate(str(input.target_date)) });
            return `Created goal "${title}".`;
        }
        case "add_milestone": {
            const goalName = str(input.goal_name);
            const title = str(input.title);
            if (!goalName || !title) return "Error: goal_name and title are required.";
            const allGoals = await db.select().from(goals);
            const match = findByName(goalName, allGoals, (g) => g.title);
            if (!match) return `No goal matches "${goalName}". Goals: ${allGoals.map((g) => g.title).join(", ") || "none"}.`;
            await addMilestone(match.id, title, resolveDate(str(input.due_date)));
            return `Added milestone "${title}" to "${match.title}".`;
        }
        default:
            return `Error: unknown tool "${name}".`;
    }
}
