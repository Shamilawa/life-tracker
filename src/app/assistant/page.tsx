import { AssistantChat } from "@/components/app/assistant-chat";
import { loadUiMessages } from "@/lib/assistant/history";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
    const initialMessages = await loadUiMessages();
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

    return <AssistantChat initialMessages={initialMessages} hasApiKey={hasApiKey} />;
}
