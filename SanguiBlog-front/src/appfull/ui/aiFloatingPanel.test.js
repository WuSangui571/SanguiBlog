import assert from 'node:assert/strict';

import {
    clampFloatingPosition,
    getDefaultFloatingPosition,
    shouldStartPanelDrag
} from './aiFloatingPanel.js';

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
        rect: { left: 100, right: 560, top: 80, bottom: 680 },
        clientX: 106,
        clientY: 180,
        isInteractiveTarget: false
    }),
    true
);

assert.equal(
    shouldStartPanelDrag({
        isFloating: true,
        rect: { left: 100, right: 560, top: 80, bottom: 680 },
        clientX: 200,
        clientY: 200,
        isInteractiveTarget: false
    }),
    false
);

assert.equal(
    shouldStartPanelDrag({
        isFloating: true,
        rect: { left: 100, right: 560, top: 80, bottom: 680 },
        clientX: 104,
        clientY: 84,
        isInteractiveTarget: true
    }),
    false
);
