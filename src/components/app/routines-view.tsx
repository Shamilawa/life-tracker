"use client";

import { useState } from "react";
import { Clock, Pencil01, Plus } from "@untitledui/icons";
import { Page } from "@/components/app/page";
import { RoutineModal } from "@/components/app/routine-modal";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { daysLabel } from "@/lib/dates";
import type { RoutineWithHabits } from "@/lib/queries";

const TIME_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

export function RoutinesView({ routines, habitOptions }: { routines: RoutineWithHabits[]; habitOptions: Array<{ id: string; title: string }> }) {
    const [modal, setModal] = useState<{ open: boolean; routine: RoutineWithHabits | null }>({ open: false, routine: null });

    return (
        <Page
            title="Routines"
            description="Group habits into blocks so each part of the day runs on rails."
            actions={
                <Button size="md" iconLeading={Plus} onClick={() => setModal({ open: true, routine: null })}>
                    Add routine
                </Button>
            }
        >
            {routines.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center pt-16 text-center">
                    <FeaturedIcon color="brand" theme="modern" size="lg" icon={Clock} />
                    <h3 className="mt-4 text-lg font-semibold text-primary">Design your first routine</h3>
                    <p className="mt-1 text-sm text-tertiary">A routine bundles habits into one repeatable block — mornings are a great place to start.</p>
                    <Button className="mt-6" size="md" onClick={() => setModal({ open: true, routine: null })}>
                        Add routine
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    {routines.map((routine) => (
                        <div key={routine.id} className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary transition duration-100 hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="truncate text-md font-semibold text-primary">{routine.name}</h2>
                                        <Badge type="pill-color" color="gray" size="sm">
                                            {TIME_LABELS[routine.timeWindow]}
                                        </Badge>
                                    </div>
                                    <p className="mt-0.5 text-xs text-tertiary">{daysLabel(routine.daysOfWeek)}</p>
                                </div>
                                <ButtonUtility
                                    size="xs"
                                    color="tertiary"
                                    icon={Pencil01}
                                    tooltip="Edit routine"
                                    onClick={() => setModal({ open: true, routine })}
                                />
                            </div>

                            {routine.habits.length === 0 ? (
                                <p className="mt-4 text-sm text-tertiary">No habits assigned yet.</p>
                            ) : (
                                <ol className="mt-4 flex flex-col gap-1.5">
                                    {routine.habits.map((h, i) => (
                                        <li key={h.id} className="flex items-center gap-2.5 text-sm text-primary">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-tertiary">
                                                {i + 1}
                                            </span>
                                            <span className="truncate">{h.title}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {modal.open && <RoutineModal routine={modal.routine} habitOptions={habitOptions} onClose={() => setModal({ open: false, routine: null })} />}
        </Page>
    );
}
