export function shouldLockAssistantViewport(historyOpen) {
    return Boolean(historyOpen);
}

export function shouldCapturePageScrollWithAssistantOpen() {
    return false;
}

export function getHistoryPopoverScrollbarClass(isDarkMode) {
    return isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar sg-scrollbar-light';
}

export function getHistoryPopoverScrollStyle() {
    return {
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
    };
}
