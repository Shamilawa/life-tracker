"use client";

import { useState, useTransition } from "react";
import { XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { DayChips } from "@/components/app/day-chips";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { type RoutineInput, createRoutine, deleteRoutine, updateRoutine } from "@/lib/actions";
import type { TimeWindow } from "@/lib/db/schema";
import type { RoutineWithHabits } from "@/lib/queries";

export function RoutineModal({
    routine,
    habitOptions,
    onClose,
}: {
    routine: RoutineWithHabits | null; // null = create
    habitOptions: Array<{ id: string; title: string }>;
    onClose: () => void;
}) {
    const [name, setName] = useState(routine?.name ?? "");
    const [timeWindow, setTimeWindow] = useState<TimeWindow>(routine?.timeWindow ?? "morning");
    const [days, setDays] = useState<number[]>(routine?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
    const [habitIds, setHabitIds] = useState<string[]>(routine?.habits.map((h) => h.id) ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const toggleHabit = (id: string, selected: boolean) => setHabitIds((prev) => (selected ? [...prev, id] : prev.filter((x) => x !== id)));

    const save = () => {
        if (!name.trim()) return setError("Give the routine a name.");
        if (days.length === 0) return setError("Pick at least one day.");
        const input: RoutineInput = { name: name.trim(), timeWindow, daysOfWeek: days, habitIds };
        startTransition(async () => {
            if (routine) await updateRoutine(routine.id, input);
            else await createRoutine(input);
            onClose();
        });
    };

    const remove = () => {
        if (!routine) return;
        startTransition(async () => {
            await deleteRoutine(routine.id);
            onClose();
        });
    };

    return (
        <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
            <Modal className="w-full max-w-140 border border-secondary">
                <Dialog aria-label={routine ? "Edit routine" : "New routine"}>
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <h2 className="text-lg font-semibold text-primary">{routine ? "Edit routine" : "New routine"}</h2>
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close" onClick={onClose} />
                        </div>

                        <div className="mt-5 flex flex-col gap-4">
                            <Input
                                label="Name"
                                placeholder="Morning kickstart"
                                value={name}
                                onChange={(v) => {
                                    setName(v);
                                    setError(null);
                                }}
                                hint={error ?? undefined}
                                isInvalid={!!error}
                                isRequired
                            />

                            <NativeSelect
                                label="Time window"
                                value={timeWindow}
                                onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
                                options={[
                                    { label: "Morning", value: "morning" },
                                    { label: "Afternoon", value: "afternoon" },
                                    { label: "Evening", value: "evening" },
                                ]}
                            />

                            <div>
                                <p className="text-sm font-medium text-secondary">Days of the week</p>
                                <div className="mt-1.5">
                                    <DayChips
                                        value={days}
                                        onChange={(next) => {
                                            setDays(next);
                                            setError(null);
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-secondary">Habits in this routine</p>
                                {habitOptions.length === 0 ? (
                                    <p className="mt-1.5 text-sm text-tertiary">No habits yet — create habits first, then group them here.</p>
                                ) : (
                                    <div className="mt-1.5 flex max-h-56 flex-col gap-2 overflow-y-auto rounded-lg p-3 ring-1 ring-secondary">
                                        {habitOptions.map((h) => (
                                            <Checkbox
                                                key={h.id}
                                                label={h.title}
                                                isSelected={habitIds.includes(h.id)}
                                                onChange={(selected) => toggleHabit(h.id, selected)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <div>
                                {routine && (
                                    <Button color="link-destructive" size="sm" onClick={remove} isDisabled={isPending}>
                                        Delete routine
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button color="secondary" size="md" onClick={onClose} isDisabled={isPending}>
                                    Cancel
                                </Button>
                                <Button size="md" onClick={save} isLoading={isPending}>
                                    {routine ? "Save changes" : "Create routine"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
