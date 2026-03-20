import assert from 'node:assert/strict';

import {
    getDefaultFloatingSize,
    resizeFloatingPanel,
    clampFloatingPosition,
    getDefaultFloatingPosition,
    shouldStartPanelDrag
} from './aiFloatingPanel.js';

assert.deepEqual(
    getDefaultFloatingSize({
        viewportHeight: 900,
        headerHeight: 72
    }),
    {
        width: 460,
        height: 760
    }
);

assert.deepEqual(
    getDefaultFloatingPosition({
        viewportWidth: 1400,
        headerHeight: 72
    }),
    {
        x: 916,
        y: 88
    }
);

assert.deepEqual(
    clampFloatingPosition({
        x: 1400,
        y: 900,
        viewportWidth: 1440,
        viewportHeight: 900,
        panelWidth: 460,
        panelHeight: 600,
        headerHeight: 72
    }),
    {
        x: 972,
        y: 292
    }
);

assert.deepEqual(
    clampFloatingPosition({
        x: -20,
        y: 10,
        viewportWidth: 1440,
        viewportHeight: 900,
        panelWidth: 460,
        panelHeight: 600,
        headerHeight: 72
    }),
    {
        x: 8,
        y: 80
    }
);

assert.equal(
    shouldStartPanelDrag({
        isFloating: true,
        rect: { left: 100, right: 560, top: 80, bottom: 150 },
        isInteractiveTarget: false
    }),
    true
);

assert.equal(
    shouldStartPanelDrag({
        isFloating: true,
        rect: { left: 100, right: 560, top: 80, bottom: 150 },
        isInteractiveTarget: false
    }),
    true
);

assert.equal(
    shouldStartPanelDrag({
        isFloating: true,
        rect: { left: 100, right: 560, top: 80, bottom: 150 },
        isInteractiveTarget: true
    }),
    false
);

assert.deepEqual(
    resizeFloatingPanel({
        direction: 'se',
        startRect: { x: 900, y: 100, width: 460, height: 600 },
        pointerX: 1500,
        pointerY: 900,
        viewportWidth: 1440,
        viewportHeight: 900,
        headerHeight: 72
    }),
    {
        x: 900,
        y: 100,
        width: 532,
        height: 792
    }
);

assert.deepEqual(
    resizeFloatingPanel({
        direction: 'nw',
        startRect: { x: 900, y: 120, width: 460, height: 600 },
        pointerX: 700,
        pointerY: 20,
        viewportWidth: 1440,
        viewportHeight: 900,
        headerHeight: 72
    }),
    {
        x: 700,
        y: 80,
        width: 660,
        height: 640
    }
);

assert.deepEqual(
    resizeFloatingPanel({
        direction: 'w',
        startRect: { x: 300, y: 140, width: 420, height: 560 },
        pointerX: 600,
        pointerY: 140,
        viewportWidth: 1440,
        viewportHeight: 900,
        headerHeight: 72
    }),
    {
        x: 360,
        y: 140,
        width: 360,
        height: 560
    }
);
