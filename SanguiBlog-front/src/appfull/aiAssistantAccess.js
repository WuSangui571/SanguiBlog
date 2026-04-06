export function canUseAiAssistant() {
    return true;
}

export function isAiAssistantGuest(user) {
    return !user;
}

export function shouldResetAiAssistantState(prevUser, nextUser) {
    return Boolean(prevUser) !== Boolean(nextUser);
}

export function getAiAssistantGuestReply() {
    return '访客模式下可直接体验 AI 助理，但会受到更严格的频率与额度限制。';
}

export function getAiAssistantSessionHint(user) {
    return user
        ? '已登录，可使用完整历史会话'
        : '访客模式仅保留当前临时对话';
}
