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
        '我可以帮你总结文章、解答站内问题，也能结合当前页面继续聊。',
        '直接问我就行。'
    ];
}
