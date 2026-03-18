import assert from 'node:assert/strict';

import {
    isIdleNewSession,
    shouldCloseHistoryPopover
} from './aiSessionToolbar.js';

assert.equal(
    isIdleNewSession({
        activeSessionId: null,
        messages: [],
        draft: ''
    }),
    true
);

assert.equal(
    isIdleNewSession({
        activeSessionId: 12,
        messages: [],
        draft: ''
    }),
    false
);

assert.equal(
    isIdleNewSession({
        activeSessionId: null,
        messages: [{ id: 1 }],
        draft: ''
    }),
    false
);

assert.equal(
    isIdleNewSession({
        activeSessionId: null,
        messages: [],
        draft: 'hello'
    }),
    false
);

assert.equal(
    shouldCloseHistoryPopover({
        isHistoryOpen: true,
        clickedInsidePopover: false,
        clickedInsideTrigger: false
    }),
    true
);

assert.equal(
    shouldCloseHistoryPopover({
        isHistoryOpen: true,
        clickedInsidePopover: true,
        clickedInsideTrigger: false
    }),
    false
);

assert.equal(
    shouldCloseHistoryPopover({
        isHistoryOpen: true,
        clickedInsidePopover: false,
        clickedInsideTrigger: true
    }),
    false
);

assert.equal(
    shouldCloseHistoryPopover({
        isHistoryOpen: false,
        clickedInsidePopover: false,
        clickedInsideTrigger: false
    }),
    false
);
