import { ConsistencyHeatmap } from "@/components/app/consistency-heatmap";
import { LifeHero } from "@/components/app/life-progress";
import { Page } from "@/components/app/page";
import { getInsights } from "@/lib/queries";
import { cx } from "@/utils/cx";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
            <p className="text-sm font-medium text-tertiary">{label}</p>
            <p className="mt-2 text-display-xs font-semibold text-primary">{value}</p>
            {sub && <p className="mt-1 truncate text-sm text-tertiary">{sub}</p>}
        </div>
    );
}

export default async function InsightsPage() {
    const insights = await getInsights();

    return (
        <Page title="Insights" description="Is the system working? The numbers do not negotiate.">
            <div className="mb-4">
                <LifeHero life={insights.life} />
            </div>

            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
                <StatCard label="This week" value={`${insights.completion7}%`} sub="Habit completion, last 7 days" />
                <StatCard label="This month" value={`${insights.completion30}%`} sub="Habit completion, last 30 days" />
                <StatCard
                    label="Best streak"
                    value={insights.bestStreak ? `${insights.bestStreak.days} days` : "—"}
                    sub={insights.bestStreak?.title ?? "No active streaks yet"}
                />
                <StatCard label="Active goals" value={insights.activeGoals.toLocaleString()} sub="Currently being pursued" />
            </div>

            <div className="mt-4 grid grid-cols-[1fr_360px] items-start gap-4 max-xl:grid-cols-1">
                <section className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                    <div className="flex items-center justify-between">
                        <h2 className="text-md font-semibold text-primary">Consistency</h2>
                        <p className="text-sm text-tertiary">Last 12 weeks</p>
                    </div>
                    <div className="mt-4">
                        <ConsistencyHeatmap cells={insights.heatmap} />
                    </div>
                </section>

                <section className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                    <div className="flex items-center justify-between">
                        <h2 className="text-md font-semibold text-primary">Daily completion</h2>
                        <p className="text-sm text-tertiary">Last 14 days</p>
                    </div>
                    <div className="mt-4 flex h-32 items-end gap-1.5">
                        {insights.weeklyTrend.map((day) => {
                            const pct = day.due ? Math.round((day.done / day.due) * 100) : 0;
                            return (
                                <div
                                    key={day.date}
                                    className="flex h-full flex-1 items-end rounded-t-sm bg-secondary"
                                    title={`${day.date} — ${day.due ? `${day.done} of ${day.due} done` : "nothing due"}`}
                                >
                                    <div className={cx("w-full rounded-t-sm", pct > 0 && "bg-brand-solid")} style={{ height: `${pct}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-quaternary">
                        <span>14 days ago</span>
                        <span>Today</span>
                    </div>
                </section>
            </div>
        </Page>
    );
}
