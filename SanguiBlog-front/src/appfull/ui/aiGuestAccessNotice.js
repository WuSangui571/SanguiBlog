const formatRetryAfter = (seconds) => {
    const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(1, Math.ceil(Number(seconds))) : 0;
    if (!safeSeconds) return '';
    if (safeSeconds < 60) return `${safeSeconds} 秒后`;
    const minutes = Math.ceil(safeSeconds / 60);
    if (minutes < 60) return `${minutes} 分钟后`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} 小时后`;
};

export function buildAiGuestAccessNotice({ isGuestMode, payload = {}, message = '', status }) {
    if (!isGuestMode) {
        return null;
    }

    if (payload?.captchaRequired) {
        return '当前访客提问过快，本次未发送到 AI。请先完成验证码后再继续提问。登录后可获得更高的提问额度。';
    }

    if (payload?.dailyBudgetExceeded) {
        return '今日访客 AI 额度已用完，本次未发送到 AI。请稍后再试，或登录后继续使用更高额度。';
    }

    if (status === 429 || Number(payload?.retryAfterSeconds) > 0) {
        const retryAfter = formatRetryAfter(payload?.retryAfterSeconds);
        const retryText = retryAfter ? `${retryAfter}再试。` : '稍后再试。';
        return `当前访客提问过于频繁，本次未发送到 AI。请${retryText}登录后可获得更高的提问额度。`;
    }

    if (payload?.guestAccessEnabled === false) {
        return '当前仅已登录用户可使用 AI 助理。登录后可获得更完整的对话能力。';
    }

    if (typeof message === 'string' && message.trim()) {
        return message.trim();
    }

    return null;
}
