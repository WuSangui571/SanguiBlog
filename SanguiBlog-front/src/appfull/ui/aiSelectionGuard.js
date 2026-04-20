export function normalizeSelectedText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function isAiSelectableTextTarget(target) {
    if (!target || typeof target.closest !== 'function') {
        return false;
    }

    return Boolean(
        target.closest('[data-ai-message-selectable="true"], .sg-ai-message-text')
    );
}

export function shouldRaiseAssistantOverlayOnPointerDown({
    button = 0,
    selectedText = '',
    selectableTextTarget = false
} = {}) {
    if (button === 2) {
        return false;
    }

    if (selectableTextTarget) {
        return false;
    }

    return !normalizeSelectedText(selectedText);
}
