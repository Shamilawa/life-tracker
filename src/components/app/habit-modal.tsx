"use client";

import { useState, useTransition } from "react";
import { XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { DayChips } from "@/components/app/day-chips";
import { type HabitInput, createHabit, deleteHabit, updateHabit } from "@/lib/actions";
import type { Habit, TimeOfDay } from "@/lib/db/schema";

export function HabitModal({
    habit,
    goalOptions,
    onClose,
}: {
    habit: Habit | null; // null = create
    goalOptions: Array<{ id: string; title: string }>;
    onClose: () => void;
}) {
    const [title, setTitle] = useState(habit?.title ?? "");
    const [category, setCategory] = useState(habit?.category ?? "");
    const [days, setDays] = useState<number[]>(habit?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
    const [startTime, setStartTime] = useState(habit?.startTime ?? "");
    const [endTime, setEndTime] = useState(habit?.endTime ?? "");
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(habit?.timeOfDay ?? "anytime");
    const [goalId, setGoalId] = useState<string>(habit?.goalId ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const save = () => {
        if (!title.trim()) return setError("Give the habit a name.");
        if (days.length === 0) return setError("Pick at least one day.");
        const input: HabitInput = {
            title: title.trim(),
            daysOfWeek: days,
            timeOfDay,
            startTime: startTime || null,
            endTime: endTime || null,
            category: category.trim() || "General",
            goalId: goalId || null,
        };
        startTransition(async () => {
            if (habit) await updateHabit(habit.id, input);
            else await createHabit(input);
            onClose();
        });
    };

    const remove = () => {
        if (!habit) return;
        startTransition(async () => {
            await deleteHabit(habit.id);
            onClose();
        });
    };

    return (
        <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
            <Modal className="w-full max-w-140">
                <Dialog aria-label={habit ? "Edit habit" : "New habit"}>
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <h2 className="text-lg font-semibold text-primary">{habit ? "Edit habit" : "New habit"}</h2>
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close" onClick={onClose} />
                        </div>

                        <div className="mt-5 flex flex-col gap-4">
                            <Input
                                label="Name"
                                placeholder="Read 20 pages"
                                value={title}
                                onChange={(v) => {
                                    setTitle(v);
                                    setError(null);
                                }}
                                hint={error ?? undefined}
                                isInvalid={!!error}
                                isRequired
                            />

                            <Input
                                label="Category"
                                hint="Groups the habit on your Today page, e.g. Trading or Life Style."
                                placeholder="General"
                                value={category}
                                onChange={setCategory}
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

                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Start time" type="time" value={startTime} onChange={setStartTime} />
                                <Input label="End time" type="time" value={endTime} onChange={setEndTime} />
                            </div>

                            <NativeSelect
                                label="Time of day"
                                value={timeOfDay}
                                onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                                options={[
                                    { label: "Morning", value: "morning" },
                                    { label: "Afternoon", value: "afternoon" },
                                    { label: "Evening", value: "evening" },
                                    { label: "Anytime", value: "anytime" },
                                ]}
                            />

                            <NativeSelect
                                label="Linked goal"
                                hint="Optional — connects daily effort to a long-term goal."
                                value={goalId}
                                onChange={(e) => setGoalId(e.target.value)}
                                options={[{ label: "No goal", value: "" }, ...goalOptions.map((g) => ({ label: g.title, value: g.id }))]}
                            />
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <div>
                                {habit && (
                                    <Button color="link-destructive" size="sm" onClick={remove} isDisabled={isPending}>
                                        Delete habit
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button color="secondary" size="md" onClick={onClose} isDisabled={isPending}>
                                    Cancel
                                </Button>
                                <Button size="md" onClick={save} isLoading={isPending}>
                                    {habit ? "Save changes" : "Create habit"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
