export function shouldLockAssistantViewport(historyOpen) {
    return Boolean(historyOpen);
}

export function getHistoryPopoverScrollStyle() {
    return {
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
    };
}
