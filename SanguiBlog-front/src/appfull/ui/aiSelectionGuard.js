export function normalizeSelectedText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function shouldRaiseAssistantOverlayOnPointerDown({ button = 0, selectedText = '' } = {}) {
    if (button === 2) {
        return false;
    }

    return !normalizeSelectedText(selectedText);
}

