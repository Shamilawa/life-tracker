import "server-only";

const API = "https://api.telegram.org";

type InlineButton = { label: string; data: string };
type TelegramApiResponse<T> = { ok: boolean; result?: T; description?: string };

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
    const res = await fetch(`${API}/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = (await res.json()) as TelegramApiResponse<T>;
    if (!res.ok || !json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    return json.result as T;
}

export async function sendTelegramMessage(
    text: string,
    opts?: { buttons?: InlineButton[][] },
): Promise<{ message_id: number }> {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID not set");
    const body: Record<string, unknown> = { chat_id: chatId, text };
    if (opts?.buttons?.length) {
        body.reply_markup = {
            inline_keyboard: opts.buttons.map((row) => row.map((b) => ({ text: b.label, callback_data: b.data }))),
        };
    }
    return call("sendMessage", body);
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await call("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function clearInlineKeyboard(chatId: string | number, messageId: number): Promise<void> {
    await call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
}
