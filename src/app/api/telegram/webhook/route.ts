import { after } from "next/server";
import { archiveHabit, setHabitLog, toggleTask, updateGoal, updateTaskDueDate } from "@/lib/actions";
import { dismissFlagSuggestion, syncFlags } from "@/lib/assistant/flags";
import { runAssistantTurn } from "@/lib/assistant/run";
import { answerCallbackQuery, clearInlineKeyboard, sendTelegramMessage } from "@/lib/assistant/telegram";
import { relativeDateStr, todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type TelegramUpdate = {
    message?: { text?: string; chat?: { id?: number | string } };
    callback_query?: {
        id: string;
        data?: string;
        from?: { id?: number | string };
        message?: { chat?: { id?: number | string }; message_id?: number };
    };
};

function isAuthorizedChat(chatId: number | string | undefined): boolean {
    const expected = process.env.TELEGRAM_CHAT_ID;
    return Boolean(expected) && chatId !== undefined && String(chatId) === expected;
}

export async function POST(req: Request): Promise<Response> {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret || req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: TelegramUpdate;
    try {
        body = (await req.json()) as TelegramUpdate;
    } catch {
        return Response.json({ ok: true }); // not JSON we understand — ack, don't let Telegram retry
    }

    // Everything below always returns 200: Telegram retries non-200/timed-out deliveries with the
    // identical update, and create_task/create_habit/create_goal aren't idempotent, so a retry here
    // could double-run a real action. The DB/tool result is authoritative; the Telegram reply is best-effort.

    if (body.message?.text && isAuthorizedChat(body.message.chat?.id)) {
        const text = body.message.text;
        after(async () => {
            try {
                const result = await runAssistantTurn(text);
                await sendTelegramMessage(result.text);
            } catch (err) {
                console.error("telegram webhook: message turn failed", err);
            }
        });
        return Response.json({ ok: true });
    }

    if (body.callback_query && isAuthorizedChat(body.callback_query.from?.id)) {
        const cq = body.callback_query;
        const [action, payloadId] = (cq.data ?? "").split(":");
        after(async () => {
            try {
                let confirmText: string | undefined;
                switch (action) {
                    case "log":
                        if (payloadId) await setHabitLog(payloadId, todayStr(), "done");
                        confirmText = "Logged";
                        break;
                    case "complete":
                        if (payloadId) await toggleTask(payloadId, true);
                        confirmText = "Marked complete";
                        break;
                    case "resched":
                        if (payloadId) {
                            await updateTaskDueDate(payloadId, todayStr());
                            await syncFlags();
                        }
                        confirmText = "Rescheduled to today";
                        break;
                    case "archive":
                        if (payloadId) {
                            await archiveHabit(payloadId);
                            await syncFlags();
                        }
                        confirmText = "Archived";
                        break;
                    case "extend":
                        if (payloadId) {
                            await updateGoal(payloadId, { targetDate: relativeDateStr(30) });
                            await syncFlags();
                        }
                        confirmText = "Deadline pushed back 30 days";
                        break;
                    case "skip":
                        if (payloadId) await dismissFlagSuggestion(payloadId);
                        confirmText = "Won't suggest this again for now";
                        break;
                }
                await answerCallbackQuery(cq.id, confirmText);
                if (cq.message?.chat?.id !== undefined && cq.message?.message_id !== undefined) {
                    await clearInlineKeyboard(cq.message.chat.id, cq.message.message_id);
                }
            } catch (err) {
                console.error("telegram webhook: callback failed", err);
            }
        });
        return Response.json({ ok: true });
    }

    return Response.json({ ok: true }); // unauthorized sender, or an update type we don't handle
}
