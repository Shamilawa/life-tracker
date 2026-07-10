import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { eq, isNull, sql } from "drizzle-orm";
import { isValidDateStr, relativeDateStr } from "@/lib/dates";
import { db } from "@/lib/db";
import { assistantFlags } from "@/lib/db/schema";
import type { AssistantFlag, FlagType } from "@/lib/db/schema";
import { getGoalsWithProgress, getHabitsWithStats, getTodayView } from "@/lib/queries";
import type { AssistantPreferences } from "@/lib/queries";

const MIN_HABIT_SAMPLE = 5; // don't flag brand-new habits on thin data

type Candidate = { type: FlagType; refId: string; refTitle: string };

async function detectCandidates(): Promise<Candidate[]> {
    const [habitStats, today, goalStats] = await Promise.all([getHabitsWithStats(), getTodayView(), getGoalsWithProgress()]);

    const habitFlags: Candidate[] = habitStats
        .filter((s) => s.due30 >= MIN_HABIT_SAMPLE && s.consistency30 < 50)
        .map((s) => ({ type: "habit_at_risk" as const, refId: s.habit.id, refTitle: s.habit.title }));

    const taskFlags: Candidate[] = today.overdueTasks.map((t) => ({
        type: "task_overdue" as const,
        refId: t.id,
        refTitle: t.title,
    }));

    // No lower bound on the date check — a goal whose deadline already slipped is the
    // highest-priority case, not an excluded one (mirrors task_overdue's own philosophy).
    const deadline = relativeDateStr(14);
    const goalFlags: Candidate[] = goalStats
        .filter((g) => g.goal.status === "active" && isValidDateStr(g.goal.targetDate) && g.goal.targetDate <= deadline && g.progress < 70)
        .map((g) => ({ type: "goal_deadline_risk" as const, refId: g.goal.id, refTitle: g.goal.title }));

    return [...habitFlags, ...taskFlags, ...goalFlags];
}

// Detect, open/update/resolve — this IS loop-closing: a flag simply stops being a
// candidate once its condition clears, no explicit "mark resolved" step anywhere.
export async function syncFlags(): Promise<void> {
    const candidates = await detectCandidates();
    const open = await db.select().from(assistantFlags).where(isNull(assistantFlags.resolvedAt));
    const openByKey = new Map(open.map((f) => [`${f.type}:${f.refId}`, f]));
    const candidateKeys = new Set(candidates.map((c) => `${c.type}:${c.refId}`));

    for (const c of candidates) {
        const existing = openByKey.get(`${c.type}:${c.refId}`);
        if (existing) {
            await db.update(assistantFlags).set({ lastSeenAt: sql`now()`, refTitle: c.refTitle }).where(eq(assistantFlags.id, existing.id));
        } else {
            await db.insert(assistantFlags).values({ type: c.type, refId: c.refId, refTitle: c.refTitle });
        }
    }

    for (const f of open) {
        if (!candidateKeys.has(`${f.type}:${f.refId}`)) {
            await db.update(assistantFlags).set({ resolvedAt: sql`now()` }).where(eq(assistantFlags.id, f.id));
        }
    }
}

export type ScoredFlag = AssistantFlag & { daysFlagged: number; score: number };

const TYPE_WEIGHT: Record<FlagType, number> = { task_overdue: 3, goal_deadline_risk: 2, habit_at_risk: 1 };

function stalenessMultiplier(days: number): number {
    return 1 + Math.min(days, 14) / 7;
}

function looselyMatches(a: string, b: string): boolean {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x.includes(y) || y.includes(x);
}

export async function getTopFlags(prefs: AssistantPreferences, limit = 3): Promise<ScoredFlag[]> {
    const open = await db.select().from(assistantFlags).where(isNull(assistantFlags.resolvedAt));
    const visible = open.filter((f) => !prefs.mutedTopics.some((t) => looselyMatches(f.refTitle, t)));

    const scored: ScoredFlag[] = visible.map((f) => {
        const daysFlagged = differenceInCalendarDays(new Date(), new Date(f.firstSeenAt));
        const focusMultiplier = prefs.focus && looselyMatches(f.refTitle, prefs.focus) ? 1.5 : 1.0;
        const score = TYPE_WEIGHT[f.type] * stalenessMultiplier(daysFlagged) * focusMultiplier;
        return { ...f, daysFlagged, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type SuggestedAction = { label: string; kind: "reschedule_task" | "archive_habit" | "extend_goal_deadline"; refId: string };

export function suggestedAction(flag: ScoredFlag): SuggestedAction | null {
    if (flag.suggestionDismissedAt) return null;
    switch (flag.type) {
        case "task_overdue":
            return { label: "Move to today", kind: "reschedule_task", refId: flag.refId };
        case "habit_at_risk":
            return flag.daysFlagged >= 14 ? { label: "Archive this habit", kind: "archive_habit", refId: flag.refId } : null;
        case "goal_deadline_risk":
            return { label: "Push deadline back 30 days", kind: "extend_goal_deadline", refId: flag.refId };
    }
}

export async function dismissFlagSuggestion(id: string): Promise<void> {
    await db.update(assistantFlags).set({ suggestionDismissedAt: sql`now()` }).where(eq(assistantFlags.id, id));
}
