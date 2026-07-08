import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    type Goal,
    type Habit,
    type HabitLog,
    type Milestone,
    type Routine,
    type Task,
    dailyNotes,
    goals,
    habitLogs,
    habits,
    milestones,
    routines,
    tasks,
} from "@/lib/db/schema";
import { dayOfWeek, lastNDates, todayStr } from "@/lib/dates";

export type HabitWithLog = Habit & { todayLog: HabitLog | null; goalTitle: string | null };

export type TodayView = {
    date: string;
    routineGroups: Array<{ routine: Routine; habits: HabitWithLog[] }>;
    unroutined: Array<{ timeOfDay: Habit["timeOfDay"]; habits: HabitWithLog[] }>;
    dueCount: number;
    doneCount: number;
    tasksDue: Task[];
    overdueTasks: Task[];
};

export async function getTodayView(): Promise<TodayView> {
    const date = todayStr();
    const dow = dayOfWeek(date);

    const allHabits = await db.query.habits.findMany({
        where: eq(habits.archived, false),
        with: { routineItems: { with: { routine: true } }, goal: true },
    });
    const dueHabits = allHabits.filter((h) => h.daysOfWeek.includes(dow));

    const logs = dueHabits.length
        ? await db
              .select()
              .from(habitLogs)
              .where(
                  and(
                      eq(habitLogs.date, date),
                      inArray(
                          habitLogs.habitId,
                          dueHabits.map((h) => h.id),
                      ),
                  ),
              )
        : [];
    const logByHabit = new Map(logs.map((l) => [l.habitId, l]));

    const allRoutines = await db.select().from(routines).orderBy(asc(routines.sortOrder));
    const activeRoutines = allRoutines.filter((r) => r.daysOfWeek.includes(dow));

    const withLog = (h: (typeof dueHabits)[number]): HabitWithLog => {
        const { routineItems: _items, goal, ...habit } = h;
        return { ...habit, todayLog: logByHabit.get(h.id) ?? null, goalTitle: goal?.title ?? null };
    };

    const routineGroups = activeRoutines
        .map((routine) => ({
            routine,
            habits: dueHabits
                .filter((h) => h.routineItems.some((ri) => ri.routineId === routine.id))
                .sort((a, b) => {
                    const sa = a.routineItems.find((ri) => ri.routineId === routine.id)?.sortOrder ?? 0;
                    const sb = b.routineItems.find((ri) => ri.routineId === routine.id)?.sortOrder ?? 0;
                    return sa - sb;
                })
                .map(withLog),
        }))
        .filter((g) => g.habits.length > 0);

    const groupedIds = new Set(routineGroups.flatMap((g) => g.habits.map((h) => h.id)));
    const orphanHabits = dueHabits.filter((h) => !groupedIds.has(h.id));
    const timeOrder: Habit["timeOfDay"][] = ["morning", "afternoon", "evening", "anytime"];
    const unroutined = timeOrder
        .map((timeOfDay) => ({
            timeOfDay,
            habits: orphanHabits.filter((h) => h.timeOfDay === timeOfDay).map(withLog),
        }))
        .filter((g) => g.habits.length > 0);

    const dueCount = dueHabits.length;
    const doneCount = logs.filter((l) => l.status === "done").length;

    const openTasks = await db.query.tasks.findMany({
        where: eq(tasks.done, false),
        orderBy: [asc(tasks.dueDate)],
    });
    const tasksDue = openTasks.filter((t) => t.dueDate === date);
    const overdueTasks = openTasks.filter((t) => t.dueDate !== null && t.dueDate < date);

    return { date, routineGroups, unroutined, dueCount, doneCount, tasksDue, overdueTasks };
}

// ---- Day view (the Today landing page) ----

export type DayCategory = { category: string; habits: HabitWithLog[] };

export type DaySummary = {
    date: string;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
    categories: DayCategory[];
    tasks: Task[];
    doneCount: number;
    totalCount: number;
    pct: number;
    note: unknown | null;
};

export async function getDayView(date: string): Promise<DaySummary> {
    const today = todayStr();
    const dow = dayOfWeek(date);

    const allHabits = await db.query.habits.findMany({
        where: eq(habits.archived, false),
        with: { goal: true },
    });
    const dueHabits = allHabits.filter((h) => h.daysOfWeek.includes(dow));

    const logs = dueHabits.length
        ? await db
              .select()
              .from(habitLogs)
              .where(
                  and(
                      eq(habitLogs.date, date),
                      inArray(
                          habitLogs.habitId,
                          dueHabits.map((h) => h.id),
                      ),
                  ),
              )
        : [];
    const logByHabit = new Map(logs.map((l) => [l.habitId, l]));

    const withLog = (h: (typeof dueHabits)[number]): HabitWithLog => {
        const { goal, ...habit } = h;
        return { ...habit, todayLog: logByHabit.get(h.id) ?? null, goalTitle: goal?.title ?? null };
    };

    // Group by category; order habits within a group by start time, groups by their
    // earliest start time so morning categories (Trading 6:00) lead evening ones.
    const byCategory = new Map<string, HabitWithLog[]>();
    for (const h of dueHabits.map(withLog)) {
        const key = h.category || "General";
        if (!byCategory.has(key)) byCategory.set(key, []);
        byCategory.get(key)!.push(h);
    }
    const startKey = (h: HabitWithLog) => h.startTime ?? "99:99";
    const earliest = (hs: HabitWithLog[]) => hs.reduce((min, h) => (startKey(h) < min ? startKey(h) : min), "99:99");
    const categories: DayCategory[] = [...byCategory.entries()]
        .map(([category, hs]) => ({ category, habits: hs.sort((a, b) => startKey(a).localeCompare(startKey(b)) || a.title.localeCompare(b.title)) }))
        .sort((a, b) => earliest(a.habits).localeCompare(earliest(b.habits)) || a.category.localeCompare(b.category));

    const isToday = date === today;
    const allTasks = await db.query.tasks.findMany({ orderBy: [asc(tasks.dueDate)] });
    const dayTasks = allTasks.filter((t) => t.dueDate === date);
    const overdue = isToday ? allTasks.filter((t) => !t.done && t.dueDate !== null && t.dueDate < today) : [];
    const taskList = [...overdue, ...dayTasks];

    const doneHabits = logs.filter((l) => l.status === "done").length;
    const doneTasks = taskList.filter((t) => t.done).length;
    const totalCount = dueHabits.length + taskList.length;
    const doneCount = doneHabits + doneTasks;

    const noteRow = (await db.select().from(dailyNotes).where(eq(dailyNotes.date, date)))[0];

    return {
        date,
        isToday,
        isPast: date < today,
        isFuture: date > today,
        categories,
        tasks: taskList,
        doneCount,
        totalCount,
        pct: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
        note: noteRow?.content ?? null,
    };
}

export type HabitStats = {
    habit: Habit;
    goalTitle: string | null;
    currentStreak: number;
    consistency30: number; // 0-100, done / due over last 30 days
    heatmap: Array<{ date: string; due: boolean; status: "done" | "skipped" | null }>;
};

function computeStreak(habit: Habit, logsByDate: Map<string, HabitLog>, dates: string[]): number {
    // Walk backwards from today. Non-due days and skipped days don't break the
    // streak; a due day with no "done" log does — except today, which is still
    // in progress.
    let streak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
        const date = dates[i];
        const due = habit.daysOfWeek.includes(dayOfWeek(date));
        if (!due) continue;
        const log = logsByDate.get(date);
        if (log?.status === "done") {
            streak++;
        } else if (log?.status === "skipped") {
            continue;
        } else if (date === dates[dates.length - 1]) {
            continue; // today, not logged yet
        } else {
            break;
        }
    }
    return streak;
}

export async function getHabitsWithStats(): Promise<HabitStats[]> {
    const HEATMAP_DAYS = 84; // 12 weeks
    const dates = lastNDates(365);
    const heatmapDates = dates.slice(-HEATMAP_DAYS);
    const windowStart = dates[0];

    const allHabits = await db.query.habits.findMany({
        where: eq(habits.archived, false),
        with: { goal: true },
        orderBy: [asc(habits.createdAt)],
    });
    if (allHabits.length === 0) return [];

    const logs = await db
        .select()
        .from(habitLogs)
        .where(
            and(
                gte(habitLogs.date, windowStart),
                inArray(
                    habitLogs.habitId,
                    allHabits.map((h) => h.id),
                ),
            ),
        );
    const byHabit = new Map<string, Map<string, HabitLog>>();
    for (const log of logs) {
        if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
        byHabit.get(log.habitId)!.set(log.date, log);
    }

    const last30 = dates.slice(-30);
    return allHabits.map((h) => {
        const { goal, ...habit } = h;
        const logsByDate = byHabit.get(habit.id) ?? new Map<string, HabitLog>();

        const due30 = last30.filter((d) => habit.daysOfWeek.includes(dayOfWeek(d)));
        const done30 = due30.filter((d) => logsByDate.get(d)?.status === "done").length;

        return {
            habit,
            goalTitle: goal?.title ?? null,
            currentStreak: computeStreak(habit, logsByDate, dates),
            consistency30: due30.length ? Math.round((done30 / due30.length) * 100) : 0,
            heatmap: heatmapDates.map((date) => ({
                date,
                due: habit.daysOfWeek.includes(dayOfWeek(date)),
                status: logsByDate.get(date)?.status ?? null,
            })),
        };
    });
}

export type MilestoneWithSubtasks = Milestone & { tasks: Task[] };

export type GoalWithProgress = {
    goal: Goal;
    milestones: MilestoneWithSubtasks[];
    openTasks: Task[]; // goal-level tasks only (not milestone sub-tasks)
    linkedHabits: Habit[];
    progress: number; // 0-100
    habitConsistency30: number | null; // 0-100 across linked habits, null if none
};

// A milestone's own progress: rolled up from its sub-tasks when it has any, else its own checkbox.
function milestoneProgress(m: MilestoneWithSubtasks): number {
    return m.tasks.length ? Math.round((m.tasks.filter((t) => t.done).length / m.tasks.length) * 100) : m.done ? 100 : 0;
}

function goalProgress(goal: Goal, ms: MilestoneWithSubtasks[], ts: Task[]): number {
    if (goal.status === "completed") return 100;
    if (ms.length > 0) return Math.round(ms.reduce((sum, m) => sum + milestoneProgress(m), 0) / ms.length);
    if (ts.length > 0) return Math.round((ts.filter((t) => t.done).length / ts.length) * 100);
    return 0;
}

async function habitDoneDates(habitIds: string[], last30: string[]) {
    const windowStart = last30[0];
    const logs = habitIds.length
        ? await db
              .select()
              .from(habitLogs)
              .where(and(gte(habitLogs.date, windowStart), inArray(habitLogs.habitId, habitIds), eq(habitLogs.status, "done")))
        : [];
    const doneDates = new Map<string, Set<string>>();
    for (const log of logs) {
        if (!doneDates.has(log.habitId)) doneDates.set(log.habitId, new Set());
        doneDates.get(log.habitId)!.add(log.date);
    }
    return doneDates;
}

function habitConsistency30For(hs: Habit[], doneDates: Map<string, Set<string>>, last30: string[]): number | null {
    if (hs.length === 0) return null;
    let due = 0;
    let done = 0;
    for (const h of hs) {
        const dueDates = last30.filter((d) => h.daysOfWeek.includes(dayOfWeek(d)));
        due += dueDates.length;
        done += dueDates.filter((d) => doneDates.get(h.id)?.has(d)).length;
    }
    return due ? Math.round((done / due) * 100) : null;
}

export async function getGoalsWithProgress(): Promise<GoalWithProgress[]> {
    const allGoals = await db.query.goals.findMany({
        with: {
            milestones: { orderBy: [asc(milestones.sortOrder)], with: { tasks: true } },
            tasks: true,
            habits: { where: eq(habits.archived, false) },
        },
        orderBy: [desc(goals.status), asc(goals.targetDate)],
    });

    const last30 = lastNDates(30);
    const habitIds = allGoals.flatMap((g) => g.habits.map((h) => h.id));
    const doneDates = await habitDoneDates(habitIds, last30);

    return allGoals.map((g) => {
        const { milestones: ms, tasks: ts, habits: hs, ...goal } = g;

        return {
            goal,
            milestones: ms,
            openTasks: ts.filter((t) => !t.done && !t.milestoneId),
            linkedHabits: hs,
            progress: goalProgress(goal, ms, ts),
            habitConsistency30: habitConsistency30For(hs, doneDates, last30),
        };
    });
}

export type GoalDetail = {
    goal: Goal;
    milestones: MilestoneWithSubtasks[];
    goalTasks: Task[]; // goal-level tasks only (not milestone sub-tasks)
    linkedHabits: Habit[];
    progress: number;
    habitConsistency30: number | null;
};

export async function getGoalDetail(id: string): Promise<GoalDetail | null> {
    const g = await db.query.goals.findFirst({
        where: eq(goals.id, id),
        with: {
            milestones: { orderBy: [asc(milestones.sortOrder)], with: { tasks: { orderBy: [asc(tasks.createdAt)] } } },
            tasks: true,
            habits: { where: eq(habits.archived, false) },
        },
    });
    if (!g) return null;

    const { milestones: ms, tasks: ts, habits: hs, ...goal } = g;
    const last30 = lastNDates(30);
    const doneDates = await habitDoneDates(
        hs.map((h) => h.id),
        last30,
    );

    return {
        goal,
        milestones: ms,
        goalTasks: ts.filter((t) => !t.milestoneId),
        linkedHabits: hs,
        progress: goalProgress(goal, ms, ts),
        habitConsistency30: habitConsistency30For(hs, doneDates, last30),
    };
}

export type RoutineWithHabits = Routine & { habits: Habit[] };

export async function getRoutinesWithHabits(): Promise<RoutineWithHabits[]> {
    const all = await db.query.routines.findMany({
        with: { items: { with: { habit: true } } },
        orderBy: [asc(routines.sortOrder), asc(routines.createdAt)],
    });
    return all.map(({ items, ...routine }) => ({
        ...routine,
        habits: items
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((i) => i.habit)
            .filter((h) => !h.archived),
    }));
}

export type Insights = {
    completion7: number;
    completion30: number;
    bestStreak: { title: string; days: number } | null;
    activeGoals: number;
    weeklyTrend: Array<{ date: string; due: number; done: number }>; // last 14 days
    heatmap: Array<{ date: string; due: number; done: number }>; // last 84 days
};

export async function getInsights(): Promise<Insights> {
    const stats = await getHabitsWithStats();
    const activeGoals = (await db.select().from(goals).where(eq(goals.status, "active"))).length;

    const dates84 = lastNDates(84);
    const perDay = new Map(dates84.map((d) => [d, { date: d, due: 0, done: 0 }]));
    for (const s of stats) {
        for (const cell of s.heatmap) {
            const day = perDay.get(cell.date);
            if (!day || !cell.due) continue;
            day.due++;
            if (cell.status === "done") day.done++;
        }
    }
    const heatmap = dates84.map((d) => perDay.get(d)!);

    const rate = (days: Array<{ due: number; done: number }>) => {
        const due = days.reduce((a, d) => a + d.due, 0);
        const done = days.reduce((a, d) => a + d.done, 0);
        return due ? Math.round((done / due) * 100) : 0;
    };

    const best = stats.reduce<HabitStats | null>((acc, s) => (s.currentStreak > (acc?.currentStreak ?? 0) ? s : acc), null);

    return {
        completion7: rate(heatmap.slice(-7)),
        completion30: rate(heatmap.slice(-30)),
        bestStreak: best && best.currentStreak > 0 ? { title: best.habit.title, days: best.currentStreak } : null,
        activeGoals,
        weeklyTrend: heatmap.slice(-14),
        heatmap,
    };
}

export async function getActiveGoalOptions(): Promise<Array<{ id: string; title: string }>> {
    const rows = await db.select({ id: goals.id, title: goals.title }).from(goals).where(eq(goals.status, "active"));
    return rows;
}

export async function getHabitOptions(): Promise<Array<{ id: string; title: string }>> {
    return db.select({ id: habits.id, title: habits.title }).from(habits).where(eq(habits.archived, false));
}
