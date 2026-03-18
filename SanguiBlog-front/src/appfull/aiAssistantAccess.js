export function canUseAiAssistant(user) {
    return Boolean(user);
}

export function shouldResetAiAssistantState(prevUser, nextUser) {
    return canUseAiAssistant(prevUser) && !canUseAiAssistant(nextUser);
}

export function getAiAssistantGuestReply() {
    return '请先登录后再使用三桂博客AI助理，当前未登录状态下暂不可用。';
}

export function getAiAssistantSessionHint(user) {
    return canUseAiAssistant(user)
        ? '登录后可用'
        : '请先登录后使用';
}
