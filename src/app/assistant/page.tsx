import { AssistantChat } from "@/components/app/assistant-chat";
import { loadUiMessages } from "@/lib/assistant/history";
import { getAssistantPreferences, getAssistantSignals } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
    const initialMessages = await loadUiMessages();
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
    const signals = await getAssistantSignals();
    const preferences = await getAssistantPreferences();

    return <AssistantChat initialMessages={initialMessages} hasApiKey={hasApiKey} signals={signals} preferences={preferences} />;
}
