/**
 * Seeds a realistic starter dataset so the app is demoable on first run.
 * Run with: npm run db:seed  (wipes existing data first)
 */
import { subDays } from "date-fns";
import { db } from "./index";
import { goals, habitLogs, habits, milestones, routineItems, routines, tasks } from "./schema";

function dateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

async function main() {
    await db.delete(habitLogs);
    await db.delete(routineItems);
    await db.delete(routines);
    await db.delete(tasks);
    await db.delete(milestones);
    await db.delete(habits);
    await db.delete(goals);

    const [fitness, career, learning] = await db
        .insert(goals)
        .values([
            {
                title: "Get in the best shape of my life",
                why: "Energy and discipline compound into everything else I do.",
                targetDate: "2026-12-31",
                status: "active",
            },
            {
                title: "Launch my personal lifestyle OS",
                why: "Build software that fits me, and prove I can ship a product end to end.",
                targetDate: "2026-09-30",
                status: "active",
            },
            {
                title: "Read 24 books this year",
                why: "Deep input makes better output — trade scrolling for pages.",
                targetDate: "2026-12-31",
                status: "active",
            },
        ])
        .returning();

    await db.insert(milestones).values([
        { goalId: fitness.id, title: "Run 5k without stopping", dueDate: "2026-08-15", done: true, sortOrder: 0 },
        { goalId: fitness.id, title: "Hit 12 workouts in a month", dueDate: "2026-09-30", done: false, sortOrder: 1 },
        { goalId: fitness.id, title: "Run 10k race", dueDate: "2026-11-20", done: false, sortOrder: 2 },
        { goalId: career.id, title: "Ship Phase 1 tracker MVP", dueDate: "2026-07-20", done: false, sortOrder: 0 },
        { goalId: career.id, title: "AI assistant answering over my data", dueDate: "2026-08-10", done: false, sortOrder: 1 },
        { goalId: career.id, title: "Proactive daily briefings live", dueDate: "2026-09-01", done: false, sortOrder: 2 },
        { goalId: learning.id, title: "Finish 12 books (halfway)", dueDate: "2026-07-01", done: true, sortOrder: 0 },
        { goalId: learning.id, title: "Finish 18 books", dueDate: "2026-10-01", done: false, sortOrder: 1 },
    ]);

    const weekdays = [1, 2, 3, 4, 5];
    const everyday = [0, 1, 2, 3, 4, 5, 6];

    const [workout, run, meditate, readBooks, deepWork, journal, noPhone] = await db
        .insert(habits)
        .values([
            { title: "Strength workout", daysOfWeek: [1, 3, 5], timeOfDay: "morning", goalId: fitness.id },
            { title: "Morning run", daysOfWeek: [2, 4, 6], timeOfDay: "morning", goalId: fitness.id },
            { title: "Meditate 10 minutes", daysOfWeek: everyday, timeOfDay: "morning" },
            { title: "Read 20 pages", daysOfWeek: everyday, timeOfDay: "evening", goalId: learning.id },
            { title: "Deep work on tracker", daysOfWeek: weekdays, timeOfDay: "afternoon", goalId: career.id },
            { title: "Journal 3 lines", daysOfWeek: everyday, timeOfDay: "evening" },
            { title: "No phone first hour", daysOfWeek: everyday, timeOfDay: "morning" },
        ])
        .returning();

    const [morningRoutine, , eveningRoutine] = await db
        .insert(routines)
        .values([
            { name: "Morning kickstart", timeWindow: "morning", daysOfWeek: everyday, sortOrder: 0 },
            { name: "Builder block", timeWindow: "afternoon", daysOfWeek: weekdays, sortOrder: 1 },
            { name: "Evening wind-down", timeWindow: "evening", daysOfWeek: everyday, sortOrder: 2 },
        ])
        .returning();
    const builderBlock = (await db.select().from(routines)).find((r) => r.name === "Builder block")!;

    await db.insert(routineItems).values([
        { routineId: morningRoutine.id, habitId: noPhone.id, sortOrder: 0 },
        { routineId: morningRoutine.id, habitId: meditate.id, sortOrder: 1 },
        { routineId: morningRoutine.id, habitId: workout.id, sortOrder: 2 },
        { routineId: morningRoutine.id, habitId: run.id, sortOrder: 3 },
        { routineId: builderBlock.id, habitId: deepWork.id, sortOrder: 0 },
        { routineId: eveningRoutine.id, habitId: readBooks.id, sortOrder: 0 },
        { routineId: eveningRoutine.id, habitId: journal.id, sortOrder: 1 },
    ]);

    // ~10 weeks of logs with per-habit adherence rates; nothing logged for today
    // so the Today page starts with work to do.
    const adherence: Array<[string, number]> = [
        [workout.id, 0.85],
        [run.id, 0.7],
        [meditate.id, 0.9],
        [readBooks.id, 0.6],
        [deepWork.id, 0.8],
        [journal.id, 0.75],
        [noPhone.id, 0.5],
    ];
    const habitDays = new Map<string, number[]>([
        [workout.id, [1, 3, 5]],
        [run.id, [2, 4, 6]],
        [meditate.id, everyday],
        [readBooks.id, everyday],
        [deepWork.id, weekdays],
        [journal.id, everyday],
        [noPhone.id, everyday],
    ]);

    const logs: (typeof habitLogs.$inferInsert)[] = [];
    for (let i = 1; i <= 70; i++) {
        const d = subDays(new Date(), i);
        const ds = dateStr(d);
        const dow = d.getDay();
        for (const [habitId, rate] of adherence) {
            if (!habitDays.get(habitId)!.includes(dow)) continue;
            const roll = Math.random();
            if (roll < rate) logs.push({ habitId, date: ds, status: "done" });
            else if (roll < rate + 0.08) logs.push({ habitId, date: ds, status: "skipped" });
            // otherwise missed: no row
        }
    }
    await db.insert(habitLogs).values(logs);

    const today = dateStr(new Date());
    const tomorrow = dateStr(subDays(new Date(), -1));
    await db.insert(tasks).values([
        { title: "Design the weekly review template", goalId: career.id, dueDate: today, done: false },
        { title: "Book 10k race entry", goalId: fitness.id, dueDate: tomorrow, done: false },
        { title: "Pick next book to read", goalId: learning.id, dueDate: today, done: false },
        { title: "Set up database schema", goalId: career.id, dueDate: dateStr(subDays(new Date(), 2)), done: true },
    ]);

    console.log(`Seeded: 3 goals, 8 milestones, 7 habits, 3 routines, ${logs.length} logs, 4 tasks.`);
}

main().then(() => process.exit(0));
