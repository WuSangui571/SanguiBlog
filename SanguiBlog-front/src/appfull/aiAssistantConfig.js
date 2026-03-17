export const DEFAULT_AI_ASSISTANT_CONFIG = {
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

export function resolveAiAssistantConfig(overrides = {}) {
    const assistantName = pickTrimmed(overrides?.assistantName) || DEFAULT_AI_ASSISTANT_CONFIG.assistantName;
    const title = pickTrimmed(overrides?.title) || DEFAULT_AI_ASSISTANT_CONFIG.title;
    const welcomeMessage = pickTrimmed(overrides?.welcomeMessage) || DEFAULT_AI_ASSISTANT_CONFIG.welcomeMessage;
    const inputPlaceholder = pickTrimmed(overrides?.inputPlaceholder) || DEFAULT_AI_ASSISTANT_CONFIG.inputPlaceholder;
    const pendingReply = pickTrimmed(overrides?.pendingReply) || DEFAULT_AI_ASSISTANT_CONFIG.pendingReply;
    const logoPath = pickTrimmed(overrides?.logoPath) || DEFAULT_AI_ASSISTANT_CONFIG.logoPath;

    return {
        assistantName,
        title,
        welcomeMessage,
        inputPlaceholder,
        pendingReply,
        logoPath
    };
}
