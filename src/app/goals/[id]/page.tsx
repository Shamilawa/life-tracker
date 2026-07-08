import { notFound } from "next/navigation";
import { GoalDetailView } from "@/components/app/goal-detail-view";
import { getGoalDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const detail = await getGoalDetail(id);
    if (!detail) notFound();

    return <GoalDetailView detail={detail} />;
}
