export function isIdleNewSession({ activeSessionId, messages, draft }) {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const safeDraft = typeof draft === 'string' ? draft.trim() : '';

    return !activeSessionId && safeMessages.length === 0 && safeDraft.length === 0;
}

export function shouldCloseHistoryPopover({
    isHistoryOpen,
    clickedInsidePopover,
    clickedInsideTrigger
}) {
    if (!isHistoryOpen) {
        return false;
    }

    return !clickedInsidePopover && !clickedInsideTrigger;
}
