"use client";

import { cx } from "@/utils/cx";

const DAY_CHIPS = [
    { value: 1, label: "M" },
    { value: 2, label: "T" },
    { value: 3, label: "W" },
    { value: 4, label: "T" },
    { value: 5, label: "F" },
    { value: 6, label: "S" },
    { value: 0, label: "S" },
];

export function DayChips({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
    const toggle = (d: number) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);

    return (
        <div className="flex gap-1.5">
            {DAY_CHIPS.map((chip) => {
                const selected = value.includes(chip.value);
                return (
                    <button
                        key={chip.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggle(chip.value)}
                        className={cx(
                            "flex size-9 cursor-pointer items-center justify-center rounded-md text-sm font-semibold transition duration-100",
                            selected
                                ? "bg-brand-solid text-white hover:bg-brand-solid_hover"
                                : "text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover",
                        )}
                    >
                        {chip.label}
                    </button>
                );
            })}
        </div>
    );
}
