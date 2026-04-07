import assert from 'node:assert/strict';

import {
    getHistoryPopoverScrollbarClass,
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

assert.equal(getHistoryPopoverScrollbarClass(true), 'sg-scrollbar sg-scrollbar-dark');
assert.equal(getHistoryPopoverScrollbarClass(false), 'sg-scrollbar sg-scrollbar-light');
