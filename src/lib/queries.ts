import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
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
    gamification: GoalGamification; // this habit's own XP/level (all-time done logs + streak bonus)
};

// Longest run (ever) of consecutive due-and-done days. Skipped days are transparent
// (mirroring computeStreak); a due day with no "done" log resets the run. Longest-ever
// never decreases, so the XP bonus it feeds can never be revoked.
function longestStreak(habit: Habit, logsByDate: Map<string, HabitLog>, dates: string[]): number {
    const today = dates[dates.length - 1];
    let best = 0;
    let run = 0;
    for (const date of dates) {
        if (!habit.daysOfWeek.includes(dayOfWeek(date))) continue;
        const log = logsByDate.get(date);
        if (log?.status === "done") {
            run++;
            if (run > best) best = run;
        } else if (log?.status === "skipped" || date === today) {
            // neutral: skipped days and the in-progress today neither extend nor break the run
        } else {
            run = 0;
        }
    }
    return best;
}

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

    const allTimeDone = await habitDoneCountsAllTime(allHabits.map((h) => h.id));

    const last30 = dates.slice(-30);
    return allHabits.map((h) => {
        const { goal, ...habit } = h;
        const logsByDate = byHabit.get(habit.id) ?? new Map<string, HabitLog>();

        const due30 = last30.filter((d) => habit.daysOfWeek.includes(dayOfWeek(d)));
        const done30 = due30.filter((d) => logsByDate.get(d)?.status === "done").length;

        const streakTiers = Math.floor(longestStreak(habit, logsByDate, dates) / STREAK_TIER_DAYS);
        const habitXp = (allTimeDone.get(habit.id) ?? 0) * XP_PER_HABIT_LOG + streakTiers * XP_PER_STREAK_TIER;

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
            gamification: { xp: habitXp, ...computeLevel(habitXp) },
        };
    });
}

export type MilestoneWithSubtasks = Milestone & { tasks: Task[] };

// A goal's progress re-expressed as an arcade-style level so momentum (not
// just completeness) shows up: XP keeps accruing from habit check-ins even
// after every milestone is done.
export type GoalGamification = {
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpPerLevel: number;
    rank: string;
};

const XP_PER_LEVEL = 500;
const XP_PER_MILESTONE = 150;
const XP_PER_TASK = 40;
const XP_PER_HABIT_LOG = 5;

// Global "life" XP only — tasks are intentionally excluded from the life score.
const XP_PER_GOAL_COMPLETE = 500; // bonus when a whole goal is completed
const STREAK_TIER_DAYS = 7; // every 7 days of best-ever streak =
const XP_PER_STREAK_TIER = 50; //   a permanent streak bonus
const VITALITY_WINDOW = 14; // rolling days the penalty looks at
const VITALITY_PENALTY_WEIGHT = 1.5; // how hard the recent miss-RATE drags vitality down

function rankForLevel(level: number): string {
    if (level >= 15) return "LEGEND";
    if (level >= 10) return "VETERAN";
    if (level >= 7) return "ELITE";
    if (level >= 5) return "SPECIALIST";
    if (level >= 3) return "OPERATOR";
    return "ROOKIE";
}

// Shared level math: turn a raw XP total into level/rank + progress into the current level.
function computeLevel(xp: number): { level: number; xpIntoLevel: number; xpPerLevel: number; rank: string } {
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    return { level, xpIntoLevel: xp % XP_PER_LEVEL, xpPerLevel: XP_PER_LEVEL, rank: rankForLevel(level) };
}

function computeGamification(milestonesDone: number, tasksDone: number, habitLogsDone: number): GoalGamification {
    const xp = milestonesDone * XP_PER_MILESTONE + tasksDone * XP_PER_TASK + habitLogsDone * XP_PER_HABIT_LOG;
    return { xp, ...computeLevel(xp) };
}

// All-time count of "done" logs per habit (unlike habitDoneDates, which is windowed to 30 days) — XP rewards sustained history, not just recent consistency.
async function habitDoneCountsAllTime(habitIds: string[]): Promise<Map<string, number>> {
    if (habitIds.length === 0) return new Map();
    const rows = await db
        .select({ habitId: habitLogs.habitId, count: sql<number>`count(*)` })
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, habitIds), eq(habitLogs.status, "done")))
        .groupBy(habitLogs.habitId);
    return new Map(rows.map((r) => [r.habitId, r.count]));
}

export type GoalWithProgress = {
    goal: Goal;
    milestones: MilestoneWithSubtasks[];
    openTasks: Task[]; // goal-level tasks only (not milestone sub-tasks)
    linkedHabits: Habit[];
    progress: number; // 0-100
    habitConsistency30: number | null; // 0-100 across linked habits, null if none
    gamification: GoalGamification;
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
    const habitLogCounts = await habitDoneCountsAllTime(habitIds);

    return allGoals.map((g) => {
        const { milestones: ms, tasks: ts, habits: hs, ...goal } = g;
        const milestonesDone = ms.filter((m) => (m.tasks.length > 0 ? m.tasks.every((t) => t.done) : m.done)).length;
        const tasksDone = ts.filter((t) => t.done).length;
        const habitLogsDone = hs.reduce((sum, h) => sum + (habitLogCounts.get(h.id) ?? 0), 0);

        return {
            goal,
            milestones: ms,
            openTasks: ts.filter((t) => !t.done && !t.milestoneId),
            linkedHabits: hs,
            progress: goalProgress(goal, ms, ts),
            habitConsistency30: habitConsistency30For(hs, doneDates, last30),
            gamification: computeGamification(milestonesDone, tasksDone, habitLogsDone),
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
    gamification: GoalGamification;
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
    const habitIds = hs.map((h) => h.id);
    const doneDates = await habitDoneDates(habitIds, last30);
    const habitLogCounts = await habitDoneCountsAllTime(habitIds);

    const milestonesDone = ms.filter((m) => (m.tasks.length > 0 ? m.tasks.every((t) => t.done) : m.done)).length;
    const tasksDone = ts.filter((t) => t.done).length;
    const habitLogsDone = hs.reduce((sum, h) => sum + (habitLogCounts.get(h.id) ?? 0), 0);

    return {
        goal,
        milestones: ms,
        goalTasks: ts.filter((t) => !t.milestoneId),
        linkedHabits: hs,
        progress: goalProgress(goal, ms, ts),
        habitConsistency30: habitConsistency30For(hs, doneDates, last30),
        gamification: computeGamification(milestonesDone, tasksDone, habitLogsDone),
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

// Global "life" gamification: an all-time XP total that only grows (Level/Rank), paired
// with a recoverable Vitality bar that recent missed habits drain and consistency refills.
export type LifeProgress = {
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpPerLevel: number;
    rank: string;
    vitality: number; // 0-100
    vitalityLabel: string; // THRIVING | STEADY | STRAINED | DEPLETED | CRITICAL
    recentMisses: number; // missed due-habit-days in the last VITALITY_WINDOW days
    breakdown: { habits: number; milestones: number; goals: number; streaks: number };
};

function vitalityLabelFor(v: number): string {
    if (v >= 80) return "THRIVING";
    if (v >= 60) return "STEADY";
    if (v >= 40) return "STRAINED";
    if (v >= 20) return "DEPLETED";
    return "CRITICAL";
}

export async function getLifeProgress(): Promise<LifeProgress> {
    // ── Habits: every all-time "done" log + a permanent best-ever-streak bonus. One full
    // log scan (cheap for a single local user) feeds XP, the streak bonus, and vitality.
    const allHabits = await db.query.habits.findMany({ where: eq(habits.archived, false) });
    const habitIds = allHabits.map((h) => h.id);
    const logs = habitIds.length ? await db.select().from(habitLogs).where(inArray(habitLogs.habitId, habitIds)) : [];

    const byHabit = new Map<string, Map<string, HabitLog>>();
    let doneLogs = 0;
    for (const log of logs) {
        if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Map());
        byHabit.get(log.habitId)!.set(log.date, log);
        if (log.status === "done") doneLogs++;
    }

    const allDates = lastNDates(365); // ordered axis for the longest-streak scan
    let streakTiers = 0;
    for (const h of allHabits) {
        streakTiers += Math.floor(longestStreak(h, byHabit.get(h.id) ?? new Map(), allDates) / STREAK_TIER_DAYS);
    }

    // ── Vitality: over the window, a due-habit-day with no done/skipped log is a miss
    // (skipped is grace, not a miss). Drive vitality off the miss RATE, not the raw count,
    // so it stays meaningful whether you track 2 habits or 20, and recovers with consistency.
    const windowDates = lastNDates(VITALITY_WINDOW);
    const today = windowDates[windowDates.length - 1];
    let recentDue = 0;
    let recentMisses = 0;
    for (const h of allHabits) {
        const hLogs = byHabit.get(h.id);
        for (const d of windowDates) {
            if (d === today) continue; // today is still in progress
            if (!h.daysOfWeek.includes(dayOfWeek(d))) continue;
            recentDue++;
            if (!hLogs?.has(d)) recentMisses++;
        }
    }
    const missRate = recentDue ? recentMisses / recentDue : 0;
    const vitality = Math.max(0, Math.min(100, Math.round(100 - missRate * 100 * VITALITY_PENALTY_WEIGHT)));

    // ── Milestones (subtask rollup) + completed-goal bonuses.
    const allGoals = await db.query.goals.findMany({ with: { milestones: { with: { tasks: true } } } });
    let milestonesDone = 0;
    let goalsCompleted = 0;
    for (const g of allGoals) {
        if (g.status === "completed") goalsCompleted++;
        for (const m of g.milestones) {
            const done = m.tasks.length > 0 ? m.tasks.every((t) => t.done) : m.done;
            if (done) milestonesDone++;
        }
    }

    const breakdown = {
        habits: doneLogs * XP_PER_HABIT_LOG,
        milestones: milestonesDone * XP_PER_MILESTONE,
        goals: goalsCompleted * XP_PER_GOAL_COMPLETE,
        streaks: streakTiers * XP_PER_STREAK_TIER,
    };
    const xp = breakdown.habits + breakdown.milestones + breakdown.goals + breakdown.streaks;

    return {
        xp,
        ...computeLevel(xp),
        vitality,
        vitalityLabel: vitalityLabelFor(vitality),
        recentMisses,
        breakdown,
    };
}

export type Insights = {
    completion7: number;
    completion30: number;
    bestStreak: { title: string; days: number } | null;
    activeGoals: number;
    weeklyTrend: Array<{ date: string; due: number; done: number }>; // last 14 days
    heatmap: Array<{ date: string; due: number; done: number }>; // last 84 days
    life: LifeProgress;
};

export async function getInsights(): Promise<Insights> {
    const stats = await getHabitsWithStats();
    const activeGoals = (await db.select().from(goals).where(eq(goals.status, "active"))).length;
    const life = await getLifeProgress();

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
        life,
    };
}

export async function getActiveGoalOptions(): Promise<Array<{ id: string; title: string }>> {
    const rows = await db.select({ id: goals.id, title: goals.title }).from(goals).where(eq(goals.status, "active"));
    return rows;
}

export async function getHabitOptions(): Promise<Array<{ id: string; title: string }>> {
    return db.select({ id: habits.id, title: habits.title }).from(habits).where(eq(habits.archived, false));
}
