"use client";

import { useState } from "react";
import { Pencil01, Plus, Zap } from "@untitledui/icons";
import { HabitModal } from "@/components/app/habit-modal";
import { Page } from "@/components/app/page";
import { type DayCell, DayStrip } from "@/components/app/day-strip";
import { TermButton } from "@/components/app/term-button";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { daysLabel } from "@/lib/dates";
import type { Habit } from "@/lib/db/schema";
import { cx } from "@/utils/cx";

export type HabitCardData = {
    habit: Habit;
    goalTitle: string | null;
    currentStreak: number;
    consistency30: number;
    strip: DayCell[]; // last 28 days
};

export function HabitsView({ habits, goalOptions }: { habits: HabitCardData[]; goalOptions: Array<{ id: string; title: string }> }) {
    const [modal, setModal] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });

    return (
        <Page
            title="Habits"
            description="The daily systems behind your goals."
            actions={
                <TermButton variant="solid" iconLeading={Plus} onClick={() => setModal({ open: true, habit: null })}>
                    Add habit
                </TermButton>
            }
        >
            {habits.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center border border-secondary py-16 text-center">
                    <span className="flex size-12 items-center justify-center border border-brand text-xl text-brand-secondary">⟳</span>
                    <h3 className="mt-4 text-sm font-bold tracking-wide text-primary uppercase">Build your first habit</h3>
                    <p className="mt-1 text-sm text-tertiary">Small actions, repeated daily, are how goals actually happen.</p>
                    <TermButton className="mt-6" variant="solid" onClick={() => setModal({ open: true, habit: null })}>
                        Add habit
                    </TermButton>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    {habits.map(({ habit, goalTitle, currentStreak, consistency30, strip }) => (
                        <div key={habit.id} className="border border-secondary bg-secondary_subtle p-4 transition duration-100 hover:border-brand_alt">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-primary">{habit.title}</p>
                                    <p className="mt-0.5 truncate text-[11px] tracking-wide text-tertiary uppercase">
                                        {daysLabel(habit.daysOfWeek)}
                                        {goalTitle ? ` · ${goalTitle}` : ""}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {currentStreak > 0 && (
                                        <span
                                            className={cx(
                                                "flex items-center gap-1 text-[11px] tracking-wide tabular-nums uppercase",
                                                currentStreak >= 7 ? "text-success-primary" : "text-tertiary",
                                            )}
                                        >
                                            <Zap className="size-3" />
                                            {currentStreak}d
                                        </span>
                                    )}
                                    <TermButton
                                        variant="ghost-icon"
                                        iconLeading={Pencil01}
                                        aria-label="Edit habit"
                                        title="Edit habit"
                                        onClick={() => setModal({ open: true, habit })}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] tracking-wide text-tertiary uppercase">Last 30 days</p>
                                    <p className="text-[11px] text-secondary tabular-nums">{consistency30}%</p>
                                </div>
                                <ProgressBarBase className="mt-1.5" value={consistency30} />
                            </div>

                            <div className="mt-4">
                                <p className="mb-1.5 text-[11px] tracking-wide text-tertiary uppercase">Last 4 weeks</p>
                                <DayStrip cells={strip} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal.open && <HabitModal habit={modal.habit} goalOptions={goalOptions} onClose={() => setModal({ open: false, habit: null })} />}
        </Page>
    );
}
