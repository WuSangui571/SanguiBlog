export function shouldLockAssistantViewport(historyOpen) {
    return Boolean(historyOpen);
}

export function shouldCapturePageScrollWithAssistantOpen() {
    return false;
}

export function getHistoryPopoverScrollStyle() {
    return {
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
    };
}
