const EDGE_DRAG_THRESHOLD = 12;

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
    clientX,
    clientY,
    isInteractiveTarget
}) {
    if (!isFloating || !rect || isInteractiveTarget) {
        return false;
    }

    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    const nearLeft = offsetX <= EDGE_DRAG_THRESHOLD;
    const nearRight = rect.right - clientX <= EDGE_DRAG_THRESHOLD;
    const nearTop = offsetY <= EDGE_DRAG_THRESHOLD;
    const nearBottom = rect.bottom - clientY <= EDGE_DRAG_THRESHOLD;

    return nearLeft || nearRight || nearTop || nearBottom;
}
