"use client";

import { useState } from "react";
import { Pencil01, Plus } from "@untitledui/icons";
import { Page } from "@/components/app/page";
import { RoutineModal } from "@/components/app/routine-modal";
import { TermButton } from "@/components/app/term-button";
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
                <TermButton variant="solid" iconLeading={Plus} onClick={() => setModal({ open: true, routine: null })}>
                    Add routine
                </TermButton>
            }
        >
            {routines.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center border border-secondary py-16 text-center">
                    <span className="flex size-12 items-center justify-center border border-brand text-xl text-brand-secondary">◷</span>
                    <h3 className="mt-4 text-sm font-bold tracking-wide text-primary uppercase">Design your first routine</h3>
                    <p className="mt-1 text-sm text-tertiary">A routine bundles habits into one repeatable block — mornings are a great place to start.</p>
                    <TermButton className="mt-6" variant="solid" onClick={() => setModal({ open: true, routine: null })}>
                        Add routine
                    </TermButton>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                    {routines.map((routine) => (
                        <div key={routine.id} className="border border-secondary bg-secondary_subtle p-5 transition duration-100 hover:border-brand_alt">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="truncate text-sm font-semibold text-primary">{routine.name}</h2>
                                        <span className="text-[10px] tracking-widest text-tertiary uppercase">[{TIME_LABELS[routine.timeWindow]}]</span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] tracking-wide text-tertiary uppercase">{daysLabel(routine.daysOfWeek)}</p>
                                </div>
                                <TermButton
                                    variant="ghost-icon"
                                    iconLeading={Pencil01}
                                    aria-label="Edit routine"
                                    title="Edit routine"
                                    onClick={() => setModal({ open: true, routine })}
                                />
                            </div>

                            {routine.habits.length === 0 ? (
                                <p className="mt-4 text-sm text-tertiary">No habits assigned yet.</p>
                            ) : (
                                <ol className="mt-4 flex flex-col gap-1.5">
                                    {routine.habits.map((h, i) => (
                                        <li key={h.id} className="flex items-center gap-2.5 text-sm text-primary">
                                            <span className="flex size-5 shrink-0 items-center justify-center border border-secondary text-[10px] text-tertiary tabular-nums">
                                                {String(i + 1).padStart(2, "0")}
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
