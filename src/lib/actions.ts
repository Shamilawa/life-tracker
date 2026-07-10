"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assistantSignals, chatMessages, dailyNotes, goals, habitLogs, habits, milestones, routineItems, routines, tasks } from "@/lib/db/schema";
import type { TimeOfDay, TimeWindow } from "@/lib/db/schema";
import { todayStr } from "@/lib/dates";

function refresh() {
    revalidatePath("/", "layout");
}

// ---- Habit logs (the daily check-off) ----

export async function setHabitLog(habitId: string, date: string, status: "done" | "skipped" | null) {
    const existing = await db
        .select()
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));

    if (status === null) {
        if (existing.length) await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
    } else if (existing.length) {
        await db.update(habitLogs).set({ status }).where(eq(habitLogs.id, existing[0].id));
    } else {
        await db.insert(habitLogs).values({ habitId, date, status });
    }
    refresh();
}

// ---- Habits ----

export type HabitInput = {
    title: string;
    daysOfWeek: number[];
    timeOfDay: TimeOfDay;
    startTime: string | null;
    endTime: string | null;
    category: string;
    goalId: string | null;
};

export async function createHabit(input: HabitInput) {
    await db.insert(habits).values(input);
    refresh();
}

export async function updateHabit(id: string, input: HabitInput) {
    await db.update(habits).set(input).where(eq(habits.id, id));
    refresh();
}

export async function archiveHabit(id: string) {
    await db.update(habits).set({ archived: true }).where(eq(habits.id, id));
    refresh();
}

export async function deleteHabit(id: string) {
    await db.delete(habits).where(eq(habits.id, id));
    refresh();
}

// ---- Goals & milestones ----

export type GoalInput = {
    title: string;
    why: string | null;
    targetDate: string | null;
};

export async function createGoal(input: GoalInput) {
    const [goal] = await db.insert(goals).values(input).returning();
    refresh();
    return goal;
}

export async function updateGoal(id: string, input: Partial<GoalInput> & { status?: "active" | "completed" | "paused" }) {
    await db.update(goals).set(input).where(eq(goals.id, id));
    refresh();
}

export async function deleteGoal(id: string) {
    await db.delete(goals).where(eq(goals.id, id));
    refresh();
}

export async function addMilestone(goalId: string, title: string, dueDate: string | null) {
    const existing = await db.select().from(milestones).where(eq(milestones.goalId, goalId));
    await db.insert(milestones).values({ goalId, title, dueDate, sortOrder: existing.length });
    refresh();
}

export async function toggleMilestone(id: string, done: boolean) {
    await db.update(milestones).set({ done }).where(eq(milestones.id, id));
    refresh();
}

export async function updateMilestoneDueDate(id: string, dueDate: string | null) {
    await db.update(milestones).set({ dueDate }).where(eq(milestones.id, id));
    refresh();
}

export async function deleteMilestone(id: string) {
    await db.delete(milestones).where(eq(milestones.id, id));
    refresh();
}

// ---- Routines ----

export type RoutineInput = {
    name: string;
    timeWindow: TimeWindow;
    daysOfWeek: number[];
    habitIds: string[];
};

export async function createRoutine(input: RoutineInput) {
    const existing = await db.select().from(routines);
    const [routine] = await db
        .insert(routines)
        .values({ name: input.name, timeWindow: input.timeWindow, daysOfWeek: input.daysOfWeek, sortOrder: existing.length })
        .returning();
    if (input.habitIds.length) {
        await db.insert(routineItems).values(input.habitIds.map((habitId, i) => ({ routineId: routine.id, habitId, sortOrder: i })));
    }
    refresh();
}

export async function updateRoutine(id: string, input: RoutineInput) {
    await db
        .update(routines)
        .set({ name: input.name, timeWindow: input.timeWindow, daysOfWeek: input.daysOfWeek })
        .where(eq(routines.id, id));
    await db.delete(routineItems).where(eq(routineItems.routineId, id));
    if (input.habitIds.length) {
        await db.insert(routineItems).values(input.habitIds.map((habitId, i) => ({ routineId: id, habitId, sortOrder: i })));
    }
    refresh();
}

export async function deleteRoutine(id: string) {
    await db.delete(routines).where(eq(routines.id, id));
    refresh();
}

// ---- Tasks ----

export async function createTask(title: string, goalId: string | null, dueDate: string | null, milestoneId: string | null = null) {
    await db.insert(tasks).values({ title, goalId, dueDate, milestoneId });
    refresh();
}

export async function toggleTask(id: string, done: boolean) {
    await db.update(tasks).set({ done }).where(eq(tasks.id, id));
    refresh();
}

export async function deleteTask(id: string) {
    await db.delete(tasks).where(eq(tasks.id, id));
    refresh();
}

// ---- Daily journal ----

export async function saveDailyNote(date: string, content: unknown) {
    if (date > todayStr()) return; // future days are read-only
    const existing = await db.select().from(dailyNotes).where(eq(dailyNotes.date, date));
    if (existing.length) {
        await db.update(dailyNotes).set({ content, updatedAt: sql`now()` }).where(eq(dailyNotes.id, existing[0].id));
    } else {
        await db.insert(dailyNotes).values({ date, content });
    }
}

// ---- Assistant ----

export async function clearChatHistory() {
    await db.delete(chatMessages);
    revalidatePath("/assistant");
}

export async function dismissSignal(id: string) {
    await db.update(assistantSignals).set({ dismissedAt: sql`now()` }).where(eq(assistantSignals.id, id));
    refresh();
}
