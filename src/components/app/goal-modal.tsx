"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash01, XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { addMilestone, createGoal, deleteGoal, updateGoal } from "@/lib/actions";
import { endOfYearStr, relativeDateStr } from "@/lib/dates";
import type { Goal } from "@/lib/db/schema";

const DATE_CHIPS = [
    { id: "1m", label: "1 month", value: () => relativeDateStr(30) },
    { id: "3m", label: "3 months", value: () => relativeDateStr(90) },
    { id: "6m", label: "6 months", value: () => relativeDateStr(180) },
    { id: "eoy", label: "End of year", value: () => endOfYearStr() },
];

type MilestoneDraft = { id: number; title: string; dueDate: string };

function MilestoneDraftRow({
    draft,
    onChange,
    onRemove,
}: {
    draft: MilestoneDraft;
    onChange: (next: MilestoneDraft) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <Input
                size="sm"
                placeholder="Milestone"
                value={draft.title}
                onChange={(v) => onChange({ ...draft, title: v })}
                aria-label="Milestone title"
            />
            <div className="w-36 shrink-0">
                <Input size="sm" type="date" value={draft.dueDate} onChange={(v) => onChange({ ...draft, dueDate: v })} aria-label="Milestone due date" />
            </div>
            <ButtonUtility size="xs" color="tertiary" icon={Trash01} tooltip="Remove milestone" onClick={onRemove} />
        </div>
    );
}

export function GoalModal({ goal, onClose, onCreated, onDeleted }: { goal: Goal | null; onClose: () => void; onCreated?: (id: string) => void; onDeleted?: () => void }) {
    const [title, setTitle] = useState(goal?.title ?? "");
    const [why, setWhy] = useState(goal?.why ?? "");
    const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
    const [status, setStatus] = useState<Goal["status"]>(goal?.status ?? "active");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const nextDraftId = useRef(0);
    const [draftMilestones, setDraftMilestones] = useState<MilestoneDraft[]>([]);
    const addDraftMilestone = () => setDraftMilestones((prev) => [...prev, { id: nextDraftId.current++, title: "", dueDate: "" }]);
    const updateDraftMilestone = (id: number, next: MilestoneDraft) => setDraftMilestones((prev) => prev.map((d) => (d.id === id ? next : d)));
    const removeDraftMilestone = (id: number) => setDraftMilestones((prev) => prev.filter((d) => d.id !== id));

    const save = () => {
        if (!title.trim()) return setError("Give the goal a name.");
        const input = { title: title.trim(), why: why.trim() || null, targetDate: targetDate || null };
        startTransition(async () => {
            if (goal) {
                await updateGoal(goal.id, { ...input, status });
                onClose();
                return;
            }
            const created = await createGoal(input);
            for (const draft of draftMilestones) {
                const draftTitle = draft.title.trim();
                if (draftTitle) await addMilestone(created.id, draftTitle, draft.dueDate || null);
            }
            if (onCreated) onCreated(created.id);
            else onClose();
        });
    };

    const remove = () => {
        if (!goal) return;
        startTransition(async () => {
            await deleteGoal(goal.id);
            (onDeleted ?? onClose)();
        });
    };

    return (
        <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
            <Modal className="w-full max-w-140 border border-secondary">
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
                                hint="Optional — the reason you'll keep going when motivation dips."
                                placeholder="The reason you will keep going when motivation dips."
                                value={why}
                                onChange={setWhy}
                                rows={3}
                            />
                            <div>
                                <Input label="Target date" type="date" value={targetDate} onChange={setTargetDate} />
                                <div className="mt-2">
                                    <ButtonGroup size="sm">
                                        {DATE_CHIPS.map((chip) => (
                                            <ButtonGroupItem
                                                key={chip.id}
                                                id={chip.id}
                                                isSelected={targetDate === chip.value()}
                                                onClick={() => setTargetDate(chip.value())}
                                            >
                                                {chip.label}
                                            </ButtonGroupItem>
                                        ))}
                                    </ButtonGroup>
                                </div>
                            </div>
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

                            {!goal && (
                                <div>
                                    <p className="text-sm font-medium text-secondary">
                                        Milestones <span className="font-normal text-tertiary">(optional)</span>
                                    </p>
                                    <p className="mt-1 text-xs text-tertiary">Break this goal into checkpoints now, or add them later from the goal page.</p>
                                    {draftMilestones.length > 0 && (
                                        <div className="mt-2 flex flex-col gap-2">
                                            {draftMilestones.map((draft) => (
                                                <MilestoneDraftRow
                                                    key={draft.id}
                                                    draft={draft}
                                                    onChange={(next) => updateDraftMilestone(draft.id, next)}
                                                    onRemove={() => removeDraftMilestone(draft.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <Button className="mt-3" color="secondary" size="sm" iconLeading={Plus} onClick={addDraftMilestone}>
                                        Add milestone
                                    </Button>
                                </div>
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
