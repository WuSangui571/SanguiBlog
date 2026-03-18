import assert from 'node:assert/strict';

import {
    getHistoryPopoverScrollStyle,
    shouldLockAssistantViewport
} from './aiHistoryOverlay.js';

assert.equal(shouldLockAssistantViewport(true), true);
assert.equal(shouldLockAssistantViewport(false), false);

assert.deepEqual(getHistoryPopoverScrollStyle(), {
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch'
});
