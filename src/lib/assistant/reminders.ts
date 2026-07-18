import "server-only";
import { addMinutes, format } from "date-fns";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { sendTelegramMessage } from "@/lib/assistant/telegram";
import { todayStr } from "@/lib/dates";

const REMINDER_WINDOW_MINUTES = 15;

// Fires a Telegram "due soon" ping (with a [Completed] button) once per task, the first
// cron tick where the task's dueTime falls inside [now, now+15min). reminderSentAt makes
// this idempotent across ticks regardless of how often the cron actually runs.
export async function sendDueTaskReminders(): Promise<{ checked: number; sent: number }> {
    const today = todayStr();
    const now = new Date();
    const nowHM = format(now, "HH:mm");
    const cutoffHM = format(addMinutes(now, REMINDER_WINDOW_MINUTES), "HH:mm");

    const candidates = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.dueDate, today), eq(tasks.done, false), isNull(tasks.reminderSentAt)));

    let sent = 0;
    for (const task of candidates) {
        if (!task.dueTime) continue;
        // Loose string comparison on "HH:MM" — the window doesn't cross midnight since
        // it only ever looks 15 minutes ahead within the same day's due tasks.
        const dueSoon = task.dueTime >= nowHM && task.dueTime < cutoffHM;
        if (!dueSoon) continue;

        try {
            await sendTelegramMessage(`⏰ Reminder: "${task.title}" is due at ${task.dueTime}.`, {
                buttons: [[{ label: "✅ Completed", data: `complete:${task.id}` }]],
            });
        } catch (err) {
            console.error("task reminder: telegram send failed", task.id, err);
            continue; // leave reminderSentAt unset so the next tick retries
        }
        await db.update(tasks).set({ reminderSentAt: sql`now()` }).where(eq(tasks.id, task.id));
        sent++;
    }

    return { checked: candidates.length, sent };
}
