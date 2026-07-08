"use client";

import { useTransition } from "react";
import { Check, SkipForward } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { setHabitLog } from "@/lib/actions";
import type { HabitWithLog } from "@/lib/queries";
import { cx } from "@/utils/cx";

export function HabitCheckRow({ habit, date }: { habit: HabitWithLog; date: string }) {
    const [isPending, startTransition] = useTransition();
    const status = habit.todayLog?.status ?? null;

    const set = (next: "done" | "skipped" | null) => startTransition(() => setHabitLog(habit.id, date, next));

    return (
        <div className={cx("flex items-center gap-3 px-6 py-3.5 transition duration-100", isPending && "opacity-60")}>
            <button
                type="button"
                aria-label={status === "done" ? `Mark ${habit.title} as not done` : `Mark ${habit.title} as done`}
                onClick={() => set(status === "done" ? null : "done")}
                className={cx(
                    "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition duration-100",
                    status === "done"
                        ? "bg-brand-solid text-white hover:bg-brand-solid_hover"
                        : "ring-1 ring-primary ring-inset hover:ring-2 hover:ring-brand",
                )}
            >
                {status === "done" && <Check className="size-4 stroke-[3px]" />}
            </button>

            <div className="min-w-0 flex-1">
                <p
                    className={cx(
                        "truncate text-sm font-medium text-primary",
                        status === "done" && "text-tertiary line-through",
                        status === "skipped" && "text-quaternary line-through",
                    )}
                >
                    {habit.title}
                </p>
                {habit.goalTitle && <p className="truncate text-xs text-tertiary">{habit.goalTitle}</p>}
            </div>

            {status === "skipped" && (
                <Badge type="pill-color" color="gray" size="sm">
                    Skipped
                </Badge>
            )}

            <ButtonUtility
                size="xs"
                color="tertiary"
                icon={SkipForward}
                tooltip={status === "skipped" ? "Undo skip" : "Skip today"}
                onClick={() => set(status === "skipped" ? null : "skipped")}
            />
        </div>
    );
}
