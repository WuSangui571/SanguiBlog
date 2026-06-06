export const DEFAULT_AI_ASSISTANT_CONFIG = {
    enabled: true,
    capable: true,
    ragEnabled: false,
    ragCapable: false,
    disabledReason: null,
    ragDisabledReason: null,
    assistantName: '三桂',
    title: '三桂博客AI助理',
    welcomeMessage: '你好，我是三桂博客AI助理',
    inputPlaceholder: '请输入你的问题...',
    pendingReply: '...',
    logoPath: '/static/ai/assistant-logo.png'
};

const pickTrimmed = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const pickBoolean = (value, fallback) => {
    if (typeof value === 'boolean') return value;
    return fallback;
};

const pickStringOrNull = (value) => {
    if (typeof value === 'string' && value.length > 0) return value;
    return null;
};

export function resolveAiAssistantConfig(overrides = {}) {
    const enabled = pickBoolean(overrides?.enabled, DEFAULT_AI_ASSISTANT_CONFIG.enabled);
    const capable = pickBoolean(overrides?.capable, DEFAULT_AI_ASSISTANT_CONFIG.capable);
    const ragEnabled = pickBoolean(overrides?.ragEnabled, DEFAULT_AI_ASSISTANT_CONFIG.ragEnabled);
    const ragCapable = pickBoolean(overrides?.ragCapable, DEFAULT_AI_ASSISTANT_CONFIG.ragCapable);
    const disabledReason = pickStringOrNull(overrides?.disabledReason);
    const ragDisabledReason = pickStringOrNull(overrides?.ragDisabledReason);
    const assistantName = pickTrimmed(overrides?.assistantName) || DEFAULT_AI_ASSISTANT_CONFIG.assistantName;
    const title = pickTrimmed(overrides?.title) || DEFAULT_AI_ASSISTANT_CONFIG.title;
    const welcomeMessage = pickTrimmed(overrides?.welcomeMessage) || DEFAULT_AI_ASSISTANT_CONFIG.welcomeMessage;
    const inputPlaceholder = pickTrimmed(overrides?.inputPlaceholder) || DEFAULT_AI_ASSISTANT_CONFIG.inputPlaceholder;
    const pendingReply = pickTrimmed(overrides?.pendingReply) || DEFAULT_AI_ASSISTANT_CONFIG.pendingReply;
    const logoPath = pickTrimmed(overrides?.logoPath) || DEFAULT_AI_ASSISTANT_CONFIG.logoPath;

    return {
        enabled,
        capable,
        ragEnabled,
        ragCapable,
        disabledReason,
        ragDisabledReason,
        assistantName,
        title,
        welcomeMessage,
        inputPlaceholder,
        pendingReply,
        logoPath
    };
}
