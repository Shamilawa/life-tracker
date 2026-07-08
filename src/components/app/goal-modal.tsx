"use client";

import { useState, useTransition } from "react";
import { XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { createGoal, deleteGoal, updateGoal } from "@/lib/actions";
import type { Goal } from "@/lib/db/schema";

export function GoalModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
    const [title, setTitle] = useState(goal?.title ?? "");
    const [why, setWhy] = useState(goal?.why ?? "");
    const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
    const [status, setStatus] = useState<Goal["status"]>(goal?.status ?? "active");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const save = () => {
        if (!title.trim()) return setError("Give the goal a name.");
        const input = { title: title.trim(), why: why.trim() || null, targetDate: targetDate || null };
        startTransition(async () => {
            if (goal) await updateGoal(goal.id, { ...input, status });
            else await createGoal(input);
            onClose();
        });
    };

    const remove = () => {
        if (!goal) return;
        startTransition(async () => {
            await deleteGoal(goal.id);
            onClose();
        });
    };

    return (
        <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
            <Modal className="w-full max-w-140">
                <Dialog aria-label={goal ? "Edit goal" : "New goal"}>
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <h2 className="text-lg font-semibold text-primary">{goal ? "Edit goal" : "New goal"}</h2>
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close" onClick={onClose} />
                        </div>

                        <div className="mt-5 flex flex-col gap-4">
                            <Input
                                label="Goal"
                                placeholder="Run a 10k race"
                                value={title}
                                onChange={(v) => {
                                    setTitle(v);
                                    setError(null);
                                }}
                                hint={error ?? undefined}
                                isInvalid={!!error}
                                isRequired
                            />
                            <TextArea
                                label="Why it matters"
                                placeholder="The reason you will keep going when motivation dips."
                                value={why}
                                onChange={setWhy}
                                rows={3}
                            />
                            <Input label="Target date" type="date" value={targetDate} onChange={setTargetDate} />
                            {goal && (
                                <NativeSelect
                                    label="Status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as Goal["status"])}
                                    options={[
                                        { label: "Active", value: "active" },
                                        { label: "Completed", value: "completed" },
                                        { label: "Paused", value: "paused" },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <div>
                                {goal && (
                                    <Button color="link-destructive" size="sm" onClick={remove} isDisabled={isPending}>
                                        Delete goal
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button color="secondary" size="md" onClick={onClose} isDisabled={isPending}>
                                    Cancel
                                </Button>
                                <Button size="md" onClick={save} isLoading={isPending}>
                                    {goal ? "Save changes" : "Create goal"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
