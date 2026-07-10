"use client";

import { useState, useTransition } from "react";
import { XClose } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { InputTagsOuter } from "@/components/base/input/input-tags-outer";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { saveAssistantPreferences } from "@/lib/actions";
import type { AssistantPreferences } from "@/lib/queries";

export function PreferencesModal({ current, onClose }: { current: AssistantPreferences; onClose: () => void }) {
    const [tone, setTone] = useState(current.tone);
    const [focus, setFocus] = useState(current.focus ?? "");
    const [mutedTopics, setMutedTopics] = useState<string[]>(current.mutedTopics);
    const [isPending, startTransition] = useTransition();

    const save = () => {
        startTransition(async () => {
            await saveAssistantPreferences({ tone, focus: focus.trim() || null, mutedTopics });
            onClose();
        });
    };

    return (
        <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
            <Modal className="w-full max-w-140 border border-secondary">
                <Dialog aria-label="Assistant preferences">
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <h2 className="text-lg font-semibold text-primary">Assistant preferences</h2>
                            <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close" onClick={onClose} />
                        </div>
                        <div className="mt-5 flex flex-col gap-4">
                            <NativeSelect
                                label="Tone"
                                value={tone}
                                onChange={(e) => setTone(e.target.value as AssistantPreferences["tone"])}
                                options={[
                                    { label: "Concise", value: "concise" },
                                    { label: "Detailed", value: "detailed" },
                                ]}
                            />
                            <TextArea
                                label="Focus"
                                hint="Optional — what matters most right now."
                                placeholder="e.g. Getting back into a consistent gym routine"
                                value={focus}
                                onChange={setFocus}
                                rows={3}
                            />
                            <InputTagsOuter
                                label="Muted topics"
                                hint="Habits or goals the assistant shouldn't proactively nudge about."
                                placeholder="Type a topic and press Enter"
                                value={mutedTopics}
                                onChange={setMutedTopics}
                            />
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <Button color="secondary" size="md" onClick={onClose} isDisabled={isPending}>
                                Cancel
                            </Button>
                            <Button size="md" onClick={save} isLoading={isPending}>
                                Save
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
}
