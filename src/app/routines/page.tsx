import { RoutinesView } from "@/components/app/routines-view";
import { getHabitOptions, getRoutinesWithHabits } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RoutinesPage() {
    const [routines, habitOptions] = await Promise.all([getRoutinesWithHabits(), getHabitOptions()]);
    return <RoutinesView routines={routines} habitOptions={habitOptions} />;
}
