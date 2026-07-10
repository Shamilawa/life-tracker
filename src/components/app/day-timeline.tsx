"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckSquare } from "@untitledui/icons";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { categoryStyle, timeText } from "@/components/app/routine-summary";
import { setHabitLog, toggleTask } from "@/lib/actions";
import type { Task } from "@/lib/db/schema";
import type { HabitWithLog } from "@/lib/queries";
import { cx } from "@/utils/cx";

const PIXELS_PER_HOUR = 64;
const DEFAULT_WINDOW_START = 5 * 60; // 05:00
const DEFAULT_WINDOW_END = 23 * 60; // 23:00
const MIN_BLOCK_MINUTES = 30; // visual floor for point-in-time / very short habits

function toMinutes(time: string): number | null {
    const m = /^(\d{2}):(\d{2})$/.exec(time);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

function formatHour(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${period}`;
}

type Block = { habit: HabitWithLog; start: number; end: number; column: number; columns: number };

// Greedy interval-graph coloring: sorted by start, each habit takes the first column whose
// previous occupant has already ended, else opens a new column. `columns` (the max concurrent
// column count for that habit's cluster) is filled in afterward so blocks can divide the width.
function layoutColumns(items: Array<{ habit: HabitWithLog; start: number; end: number }>): Block[] {
    const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
    const columnEnds: number[] = [];
    const placed: Array<{ habit: HabitWithLog; start: number; end: number; column: number }> = [];

    for (const item of sorted) {
        let col = columnEnds.findIndex((end) => end <= item.start);
        if (col === -1) {
            col = columnEnds.length;
            columnEnds.push(item.end);
        } else {
            columnEnds[col] = item.end;
        }
        placed.push({ ...item, column: col });
    }

    // Overlap clusters rarely span the whole day, so just use the global max column count —
    // simple, and visually consistent even if a couple of blocks end up narrower than strictly needed.
    const columns = Math.max(1, columnEnds.length);
    return placed.map((p) => ({ ...p, columns }));
}

function NowLine({ windowStart, windowEnd }: { windowStart: number; windowEnd: number }) {
    const [minutes, setMinutes] = useState<number | null>(null);

    useEffect(() => {
        const update = () => setMinutes(new Date().getHours() * 60 + new Date().getMinutes());
        update();
        const id = setInterval(update, 60_000);
        return () => clearInterval(id);
    }, []);

    if (minutes === null || minutes < windowStart || minutes > windowEnd) return null;
    const top = ((minutes - windowStart) / (windowEnd - windowStart)) * 100;

    return (
        <div className="absolute right-0 left-11 z-10 flex items-center gap-1" style={{ top: `${top}%` }}>
            <span className="size-1.5 shrink-0 rounded-full bg-error-primary" />
            <span className="h-px flex-1 bg-error-primary" />
        </div>
    );
}

function HabitBlock({ block, windowStart, date, interactive }: { block: Block; windowStart: number; date: string; interactive: boolean }) {
    const [isPending, startTransition] = useTransition();
    const { habit, start, end, column, columns } = block;
    const done = habit.todayLog?.status === "done";
    const style = categoryStyle(habit.category);
    const Icon = style.icon;

    const widthPct = 100 / columns;
    const heightPx = Math.max(((end - start) / 60) * PIXELS_PER_HOUR, 26);
    const tall = heightPx >= 40;

    return (
        <div
            className="absolute px-0.5"
            style={{
                top: `${((start - windowStart) / 60) * PIXELS_PER_HOUR}px`,
                height: `${heightPx}px`,
                left: `${column * widthPct}%`,
                width: `${widthPct}%`,
            }}
        >
            <div
                className={cx(
                    "flex h-full items-center gap-2 overflow-hidden border border-secondary bg-secondary_subtle px-2 transition duration-100 hover:border-brand_alt",
                    done && "border-brand_alt",
                    isPending && "opacity-60",
                )}
            >
                <span className={cx("flex size-5 shrink-0 items-center justify-center", style.tile)}>
                    <Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className={cx("truncate text-[12px] font-medium text-primary", done && "text-quaternary line-through")}>{habit.title}</p>
                    {tall && <p className="truncate text-[10px] tracking-wide text-tertiary uppercase">{timeText(habit)}</p>}
                </div>
                <Checkbox
                    isSelected={done}
                    isDisabled={!interactive}
                    onChange={(next) => startTransition(() => setHabitLog(habit.id, date, next ? "done" : null))}
                    aria-label={habit.title}
                />
            </div>
        </div>
    );
}

function UnscheduledRow({ habit, date, interactive }: { habit: HabitWithLog; date: string; interactive: boolean }) {
    const [isPending, startTransition] = useTransition();
    const done = habit.todayLog?.status === "done";
    const style = categoryStyle(habit.category);
    const Icon = style.icon;

    return (
        <div
            className={cx(
                "flex items-center gap-3 border border-secondary bg-secondary_subtle p-2.5 transition duration-100 hover:border-brand_alt",
                done && "border-brand_alt",
                isPending && "opacity-60",
            )}
        >
            <span className={cx("flex size-8 shrink-0 items-center justify-center", style.tile)}>
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className={cx("truncate text-[13px] font-medium text-primary", done && "text-quaternary line-through")}>{habit.title}</p>
                <p className="truncate text-[11px] tracking-wide text-tertiary uppercase">{habit.category} · {timeText(habit)}</p>
            </div>
            <Checkbox
                isSelected={done}
                isDisabled={!interactive}
                onChange={(next) => startTransition(() => setHabitLog(habit.id, date, next ? "done" : null))}
                aria-label={habit.title}
            />
        </div>
    );
}

function UnscheduledTaskRow({ task, date, interactive }: { task: Task; date: string; interactive: boolean }) {
    const [isPending, startTransition] = useTransition();
    const overdue = !task.done && task.dueDate !== null && task.dueDate < date;

    return (
        <div
            className={cx(
                "flex items-center gap-3 border border-secondary bg-secondary_subtle p-2.5 transition duration-100 hover:border-brand_alt",
                task.done && "border-brand_alt",
                isPending && "opacity-60",
            )}
        >
            <span className="flex size-8 shrink-0 items-center justify-center bg-tertiary text-fg-quaternary">
                <CheckSquare className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className={cx("truncate text-[13px] font-medium text-primary", task.done && "text-quaternary line-through")}>{task.title}</p>
                <p className={cx("truncate text-[11px] tracking-wide uppercase", overdue ? "text-error-primary" : "text-tertiary")}>
                    {overdue ? "Task · overdue" : "Task"}
                </p>
            </div>
            <Checkbox isSelected={task.done} isDisabled={!interactive} onChange={(next) => startTransition(() => toggleTask(task.id, next))} aria-label={task.title} />
        </div>
    );
}

export function DayTimeline({ habits, tasks, date, interactive }: { habits: HabitWithLog[]; tasks: Task[]; date: string; interactive: boolean }) {
    const timed = habits
        .map((h) => {
            const start = h.startTime ? toMinutes(h.startTime) : null;
            if (start === null) return null;
            const parsedEnd = h.endTime ? toMinutes(h.endTime) : null;
            const end = parsedEnd !== null && parsedEnd > start ? parsedEnd : start + MIN_BLOCK_MINUTES;
            return { habit: h, start, end };
        })
        .filter((x): x is { habit: HabitWithLog; start: number; end: number } => x !== null);

    const unscheduled = habits.filter((h) => toMinutes(h.startTime ?? "") === null);

    const windowStart = Math.min(DEFAULT_WINDOW_START, ...timed.map((t) => t.start));
    const windowEnd = Math.max(DEFAULT_WINDOW_END, ...timed.map((t) => t.end));
    const totalHeight = ((windowEnd - windowStart) / 60) * PIXELS_PER_HOUR;

    const blocks = layoutColumns(timed);
    const hours = Array.from({ length: Math.floor((windowEnd - windowStart) / 60) + 1 }, (_, i) => windowStart + i * 60);

    return (
        <div className="flex flex-col gap-5 px-3 py-4">
            <div className="relative" style={{ height: `${totalHeight}px` }}>
                {/* Hour grid */}
                {hours.map((m) => (
                    <div
                        key={m}
                        className="absolute right-0 left-0 flex items-start gap-2"
                        style={{ top: `${((m - windowStart) / 60) * PIXELS_PER_HOUR}px` }}
                    >
                        <span className="w-9 shrink-0 -translate-y-1/2 text-right text-[10px] tabular-nums text-quaternary">{formatHour(m)}</span>
                        <span className="mt-2 h-px flex-1 bg-secondary" />
                    </div>
                ))}

                {interactive && <NowLine windowStart={windowStart} windowEnd={windowEnd} />}

                <div className="absolute top-0 right-0 bottom-0 left-11">
                    {blocks.map((b) => (
                        <HabitBlock key={b.habit.id} block={b} windowStart={windowStart} date={date} interactive={interactive} />
                    ))}
                </div>
            </div>

            {(unscheduled.length > 0 || tasks.length > 0) && (
                <div>
                    <p className="px-1 pb-2 text-[11px] tracking-widest text-quaternary uppercase">
                        <span className="text-brand-secondary/60">──</span> Anytime
                    </p>
                    <div className="flex flex-col gap-2">
                        {unscheduled.map((habit) => (
                            <UnscheduledRow key={habit.id} habit={habit} date={date} interactive={interactive} />
                        ))}
                        {tasks.map((task) => (
                            <UnscheduledTaskRow key={task.id} task={task} date={date} interactive={interactive} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
