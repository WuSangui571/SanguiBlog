export function shouldPlayAiWelcomeIntro({
    isOpen,
    messagesLength,
    messagesLoading
}) {
    return Boolean(isOpen && !messagesLoading && messagesLength === 0);
}

export function buildAiWelcomeIntroLines(welcomeMessage) {
    return [
        welcomeMessage,
        '我可以帮你总结文章、解答站内问题，也能结合当前页面继续聊。',
        '直接问我就行。'
    ];
}
