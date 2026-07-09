"use client";

import { type FC, useState, useTransition } from "react";
import { BarChart01, CheckCircle, CheckSquare, Clock, Repeat01, Stars01, Sun, Target01, Zap } from "@untitledui/icons";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { setHabitLog, toggleTask } from "@/lib/actions";
import type { Habit, Task } from "@/lib/db/schema";
import type { DayCategory, HabitWithLog } from "@/lib/queries";
import { cx } from "@/utils/cx";

const TIME_LABELS: Record<Habit["timeOfDay"], string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", anytime: "Anytime" };

// Deterministic icon + tint per category so each group reads consistently.
const PALETTE: Array<{ icon: FC<{ className?: string }>; tile: string }> = [
    { icon: BarChart01, tile: "bg-success-secondary text-fg-success-primary" },
    { icon: Stars01, tile: "bg-brand-secondary text-fg-brand-primary" },
    { icon: Target01, tile: "bg-warning-secondary text-fg-warning-primary" },
    { icon: Repeat01, tile: "bg-error-secondary text-fg-error-primary" },
    { icon: Sun, tile: "bg-success-secondary text-fg-success-primary" },
    { icon: Zap, tile: "bg-brand-secondary text-fg-brand-primary" },
    { icon: Clock, tile: "bg-warning-secondary text-fg-warning-primary" },
];

// Fitting icon + tint for well-known categories, hashed palette otherwise.
function categoryStyle(category: string): { icon: FC<{ className?: string }>; tile: string } {
    const c = category.toLowerCase();
    if (/(trad|market|invest|stock|finance)/.test(c)) return { icon: BarChart01, tile: "bg-success-secondary text-fg-success-primary" };
    if (/(life|wellness|health|self|mind|routine)/.test(c)) return { icon: Sun, tile: "bg-brand-secondary text-fg-brand-primary" };
    if (/(read|learn|study|book|grow)/.test(c)) return { icon: Target01, tile: "bg-warning-secondary text-fg-warning-primary" };
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
}

function timeText(habit: HabitWithLog): string {
    if (habit.startTime && habit.endTime) return `${habit.startTime} - ${habit.endTime}`;
    if (habit.startTime) return habit.startTime;
    return TIME_LABELS[habit.timeOfDay];
}

export function RoutineSummary({
    categories,
    tasks,
    date,
    interactive,
}: {
    categories: DayCategory[];
    tasks: Task[];
    date: string;
    interactive: boolean;
}) {
    const [view, setView] = useState<"list" | "group">("group");
    const isEmpty = categories.length === 0 && tasks.length === 0;

    const flatHabits = categories.flatMap((c) => c.habits).sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));

    return (
        <div className="flex h-full flex-col overflow-y-auto border-r border-primary bg-primary">
            <div className="flex items-center justify-between border-b border-secondary px-4 py-2.5">
                <p className="text-xs tracking-widest text-brand-secondary uppercase">// ROUTINE</p>
                <div className="flex border border-secondary">
                    <ToggleBtn active={view === "list"} onClick={() => setView("list")}>
                        List
                    </ToggleBtn>
                    <ToggleBtn active={view === "group"} onClick={() => setView("group")}>
                        Group
                    </ToggleBtn>
                </div>
            </div>

            {isEmpty ? (
                <div className="px-5 py-10 text-center">
                    <p className="text-sm text-tertiary">&gt; nothing scheduled for this day.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5 px-3 py-4">
                    {view === "group" ? (
                        <>
                            {categories.map((group) => (
                                <div key={group.category}>
                                    <p className="px-1 pb-2 text-[11px] tracking-widest text-quaternary uppercase">
                                        <span className="text-brand-secondary/60">──</span> {group.category}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {group.habits.map((habit) => (
                                            <HabitRow key={habit.id} habit={habit} date={date} interactive={interactive} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {tasks.length > 0 && (
                                <div>
                                    <p className="px-1 pb-2 text-[11px] tracking-widest text-quaternary uppercase">
                                        <span className="text-brand-secondary/60">──</span> Tasks
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {tasks.map((task) => (
                                            <TaskRow key={task.id} task={task} date={date} interactive={interactive} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col gap-2 pt-1">
                            {flatHabits.map((habit) => (
                                <HabitRow key={habit.id} habit={habit} date={date} interactive={interactive} />
                            ))}
                            {tasks.map((task) => (
                                <TaskRow key={task.id} task={task} date={date} interactive={interactive} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function HabitRow({ habit, date, interactive }: { habit: HabitWithLog; date: string; interactive: boolean }) {
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
                <p className="truncate text-[11px] tracking-wide text-tertiary uppercase">
                    {habit.category} · {timeText(habit)}
                </p>
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

function TaskRow({ task, date, interactive }: { task: Task; date: string; interactive: boolean }) {
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

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "px-3 py-1 text-[11px] tracking-widest uppercase transition duration-100",
                active ? "bg-brand-solid text-primary_on-brand" : "text-tertiary hover:text-brand-secondary",
            )}
        >
            {children}
        </button>
    );
}
