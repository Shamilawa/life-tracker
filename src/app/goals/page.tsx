import { GoalsView } from "@/components/app/goals-view";
import { getGoalsWithProgress } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
    const goals = await getGoalsWithProgress();
    return <GoalsView goals={goals} />;
}
