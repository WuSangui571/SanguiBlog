export const AI_WELCOME_INTRO_STORAGE_KEY = 'sangui-ai-welcome-intro-played';

function resolveSessionStorage(storage) {
    if (storage) return storage;
    if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage;
    }
    return null;
}

export function hasPlayedAiWelcomeIntro(storage) {
    const targetStorage = resolveSessionStorage(storage);
    if (!targetStorage) return false;
    return targetStorage.getItem(AI_WELCOME_INTRO_STORAGE_KEY) === '1';
}

export function markAiWelcomeIntroPlayed(storage) {
    const targetStorage = resolveSessionStorage(storage);
    if (!targetStorage) return;
    targetStorage.setItem(AI_WELCOME_INTRO_STORAGE_KEY, '1');
}

export function shouldPlayAiWelcomeIntro({
    isOpen,
    messagesLength,
    messagesLoading,
    hasPlayed
}) {
    return Boolean(isOpen && !messagesLoading && messagesLength === 0 && !hasPlayed);
}

export function buildAiWelcomeIntroLines(welcomeMessage) {
    return [
        welcomeMessage,
        '你可以让我总结文章、回答博客相关问题、结合当前页面内容进行说明，也能基于知识库为你提供更贴合站点内容的回复。',
        '直接输入问题即可开始对话。'
    ];
}
