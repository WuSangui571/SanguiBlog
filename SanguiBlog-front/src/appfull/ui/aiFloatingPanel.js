export const DEFAULT_FLOATING_PANEL_WIDTH = 460;
export const DEFAULT_FLOATING_PANEL_MAX_HEIGHT = 760;
export const FLOATING_PANEL_MIN_WIDTH = 360;
export const FLOATING_PANEL_MIN_HEIGHT = 420;
export const FLOATING_PANEL_MARGIN = 8;

export function getDefaultFloatingSize({
    viewportHeight,
    headerHeight,
    defaultWidth = DEFAULT_FLOATING_PANEL_WIDTH,
    defaultMaxHeight = DEFAULT_FLOATING_PANEL_MAX_HEIGHT,
    margin = FLOATING_PANEL_MARGIN
}) {
    return {
        width: defaultWidth,
        height: Math.min(
            defaultMaxHeight,
            Math.max(FLOATING_PANEL_MIN_HEIGHT, viewportHeight - headerHeight - margin * 2)
        )
    };
}

export function getDefaultFloatingPosition({
    viewportWidth,
    headerHeight,
    panelWidth = DEFAULT_FLOATING_PANEL_WIDTH,
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
    panelWidth = DEFAULT_FLOATING_PANEL_WIDTH,
    panelHeight,
    headerHeight,
    margin = FLOATING_PANEL_MARGIN
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

export function resizeFloatingPanel({
    direction,
    startRect,
    pointerX,
    pointerY,
    viewportWidth,
    viewportHeight,
    headerHeight,
    minWidth = FLOATING_PANEL_MIN_WIDTH,
    minHeight = FLOATING_PANEL_MIN_HEIGHT,
    margin = FLOATING_PANEL_MARGIN
}) {
    const viewportRight = viewportWidth - margin;
    const viewportBottom = viewportHeight - margin;
    const viewportLeft = margin;
    const viewportTop = headerHeight + margin;

    let left = startRect.x;
    let right = startRect.x + startRect.width;
    let top = startRect.y;
    let bottom = startRect.y + startRect.height;

    if (direction.includes('e')) {
        right = Math.min(Math.max(pointerX, left + minWidth), viewportRight);
    }
    if (direction.includes('s')) {
        bottom = Math.min(Math.max(pointerY, top + minHeight), viewportBottom);
    }
    if (direction.includes('w')) {
        left = Math.max(viewportLeft, Math.min(pointerX, right - minWidth));
    }
    if (direction.includes('n')) {
        top = Math.max(viewportTop, Math.min(pointerY, bottom - minHeight));
    }

    const width = Math.max(minWidth, right - left);
    const height = Math.max(minHeight, bottom - top);

    return {
        x: right - width,
        y: bottom - height,
        width,
        height
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
