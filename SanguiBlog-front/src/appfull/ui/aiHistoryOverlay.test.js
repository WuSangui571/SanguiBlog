import assert from 'node:assert/strict';

import {
    getHistoryPopoverScrollStyle,
    shouldCapturePageScrollWithAssistantOpen,
    shouldLockAssistantViewport
} from './aiHistoryOverlay.js';

assert.equal(shouldLockAssistantViewport(true), true);
assert.equal(shouldLockAssistantViewport(false), false);
assert.equal(shouldCapturePageScrollWithAssistantOpen(true), false);
assert.equal(shouldCapturePageScrollWithAssistantOpen(false), false);

assert.deepEqual(getHistoryPopoverScrollStyle(), {
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch'
});
