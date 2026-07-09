import { XpMeter } from "@/components/app/goal-gamification";
import type { LifeProgress } from "@/lib/queries";
import { cx } from "@/utils/cx";

/** success ≥60, warning ≥40, error below — matches the vitalityLabelFor tiers in queries.ts. */
function vitalityColor(v: number): string {
    if (v >= 60) return "text-success-primary";
    if (v >= 40) return "text-warning-primary";
    return "text-error-primary";
}

/**
 * HP-style recoverable bar. Unlike XpMeter (progress into a level), this is an absolute
 * 0-100 health readout: recently missed habits drain it, consistency lets it refill.
 */
export function VitalityMeter({ vitality, label, width = 10 }: { vitality: number; label?: string; width?: number }) {
    const filled = Math.round((vitality / 100) * width);
    const color = vitalityColor(vitality);
    return (
        <span className="flex items-center gap-1.5 text-[11px] tabular-nums">
            <span className={color}>♥</span>
            <span className={color}>
                [{"■".repeat(filled)}
                {"□".repeat(width - filled)}]
            </span>
            <span className={color}>
                {vitality}/100{label ? ` · ${label}` : ""}
            </span>
        </span>
    );
}

/** Compact always-on header readout: LVL n · ♥v. */
export function LifeHud({ life }: { life: LifeProgress }) {
    return (
        <span className="flex items-center gap-2 text-[11px] tabular-nums">
            <span className="tracking-widest text-brand-secondary uppercase">
                LVL {life.level}
            </span>
            <span className="text-quaternary">·</span>
            <span className={cx("flex items-center gap-0.5", vitalityColor(life.vitality))}>
                ♥{life.vitality}
            </span>
        </span>
    );
}

function BreakdownItem({ label, xp }: { label: string; xp: number }) {
    return (
        <div className="border border-secondary bg-secondary_subtle px-2.5 py-2">
            <p className="text-[10px] tracking-widest text-quaternary uppercase">{label}</p>
            <p className="mt-0.5 text-sm text-primary tabular-nums">{xp.toLocaleString()}</p>
        </div>
    );
}

/** Full "Life progress" hero for the Insights page: level/rank, all-time XP, breakdown, vitality. */
export function LifeHero({ life }: { life: LifeProgress }) {
    return (
        <section className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] tracking-widest text-tertiary uppercase">Life progress</p>
                    <p className="mt-1 flex items-baseline gap-2">
                        <span className="term-glow text-display-xs font-semibold text-primary tabular-nums">LVL {life.level}</span>
                        <span className="text-[11px] tracking-widest text-brand-secondary uppercase">{life.rank}</span>
                    </p>
                </div>
                <VitalityMeter vitality={life.vitality} label={life.vitalityLabel} width={14} />
            </div>

            <div className="mt-4">
                <XpMeter xpIntoLevel={life.xpIntoLevel} xpPerLevel={life.xpPerLevel} width={24} />
                <p className="mt-2 text-[11px] text-tertiary tabular-nums">{life.xp.toLocaleString()} XP earned all-time · only ever grows</p>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 max-sm:grid-cols-2">
                <BreakdownItem label="Habits" xp={life.breakdown.habits} />
                <BreakdownItem label="Milestones" xp={life.breakdown.milestones} />
                <BreakdownItem label="Goals" xp={life.breakdown.goals} />
                <BreakdownItem label="Streaks" xp={life.breakdown.streaks} />
            </div>

            {life.recentMisses > 0 && (
                <p className="mt-3 text-[11px] text-tertiary tabular-nums">
                    <span className={vitalityColor(life.vitality)}>−{100 - life.vitality} vitality</span> from {life.recentMisses} missed{" "}
                    {life.recentMisses === 1 ? "habit" : "habits"} in the last 14 days · recovers as you stay consistent
                </p>
            )}
        </section>
    );
}
