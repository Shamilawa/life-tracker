"use client";

import { useState } from "react";
import { Pencil01, Plus, Repeat01, Zap } from "@untitledui/icons";
import { HabitModal } from "@/components/app/habit-modal";
import { Page } from "@/components/app/page";
import { type DayCell, DayStrip } from "@/components/app/day-strip";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { daysLabel } from "@/lib/dates";
import type { Habit } from "@/lib/db/schema";

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
                <Button size="md" iconLeading={Plus} onClick={() => setModal({ open: true, habit: null })}>
                    Add habit
                </Button>
            }
        >
            {habits.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center pt-16 text-center">
                    <FeaturedIcon color="brand" theme="modern" size="lg" icon={Repeat01} />
                    <h3 className="mt-4 text-lg font-semibold text-primary">Build your first habit</h3>
                    <p className="mt-1 text-sm text-tertiary">Small actions, repeated daily, are how goals actually happen.</p>
                    <Button className="mt-6" size="md" onClick={() => setModal({ open: true, habit: null })}>
                        Add habit
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    {habits.map(({ habit, goalTitle, currentStreak, consistency30, strip }) => (
                        <div key={habit.id} className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-primary">{habit.title}</p>
                                    <p className="mt-0.5 truncate text-xs text-tertiary">
                                        {daysLabel(habit.daysOfWeek)}
                                        {goalTitle ? ` · ${goalTitle}` : ""}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {currentStreak > 0 && (
                                        <Badge type="pill-color" color={currentStreak >= 7 ? "success" : "gray"} size="sm">
                                            <span className="flex items-center gap-1">
                                                <Zap className="size-3" />
                                                {currentStreak} day{currentStreak === 1 ? "" : "s"}
                                            </span>
                                        </Badge>
                                    )}
                                    <ButtonUtility
                                        size="xs"
                                        color="tertiary"
                                        icon={Pencil01}
                                        tooltip="Edit habit"
                                        onClick={() => setModal({ open: true, habit })}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-tertiary">Last 30 days</p>
                                    <p className="text-xs font-medium text-secondary">{consistency30}%</p>
                                </div>
                                <ProgressBarBase className="mt-1.5" value={consistency30} />
                            </div>

                            <div className="mt-4">
                                <p className="mb-1.5 text-xs font-medium text-tertiary">Last 4 weeks</p>
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
