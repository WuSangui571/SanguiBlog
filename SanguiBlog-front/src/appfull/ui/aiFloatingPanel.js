export function getDefaultFloatingPosition({
    viewportWidth,
    headerHeight,
    panelWidth = 460,
    topOffset = 16,
    rightOffset = 24
}) {
    return {
        x: Math.max(rightOffset, viewportWidth - panelWidth - rightOffset),
        y: headerHeight + topOffset
    };
}

export function clampFloatingPosition({
    x,
    y,
    viewportWidth,
    viewportHeight,
    panelWidth = 460,
    panelHeight,
    headerHeight,
    margin = 8
}) {
    const safeHeight = Number.isFinite(panelHeight) ? panelHeight : viewportHeight - headerHeight;
    const minX = margin;
    const maxX = Math.max(minX, viewportWidth - panelWidth - margin);
    const minY = headerHeight + margin;
    const maxY = Math.max(minY, viewportHeight - safeHeight - margin);

    return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY)
    };
}

export function shouldStartPanelDrag({
    isFloating,
    rect,
    isInteractiveTarget
}) {
    if (!isFloating || !rect || isInteractiveTarget) {
        return false;
    }

    return true;
}
