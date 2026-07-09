import { type HabitCardData, HabitsView } from "@/components/app/habits-view";
import { getActiveGoalOptions, getHabitsWithStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
    const [stats, goalOptions] = await Promise.all([getHabitsWithStats(), getActiveGoalOptions()]);

    const habits: HabitCardData[] = stats.map((s) => ({
        habit: s.habit,
        goalTitle: s.goalTitle,
        currentStreak: s.currentStreak,
        consistency30: s.consistency30,
        strip: s.heatmap.slice(-28),
        gamification: s.gamification,
    }));

    return <HabitsView habits={habits} goalOptions={goalOptions} />;
}
