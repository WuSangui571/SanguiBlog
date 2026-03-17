export const AI_CONVERSATION_STORAGE_KEY = 'sg_ai_conversation_id';

const createFallbackConversationId = () => `sg-ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function resolveAiConversationId(storage = globalThis?.localStorage) {
    const existing = storage?.getItem?.(AI_CONVERSATION_STORAGE_KEY)?.trim?.();
    if (existing) {
        return existing;
    }

    const generated = globalThis?.crypto?.randomUUID?.() || createFallbackConversationId();
    storage?.setItem?.(AI_CONVERSATION_STORAGE_KEY, generated);
    return generated;
}
