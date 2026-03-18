import assert from 'node:assert/strict';

import {
    canUseAiAssistant,
    getAiAssistantGuestReply,
    getAiAssistantSessionHint,
    shouldResetAiAssistantState
} from './aiAssistantAccess.js';

assert.equal(canUseAiAssistant(null), false);
assert.equal(canUseAiAssistant(undefined), false);
assert.equal(canUseAiAssistant({ id: 1 }), true);

assert.equal(
    getAiAssistantGuestReply(),
    '请先登录后再使用三桂博客AI助理，当前未登录状态下暂不可用。'
);

assert.equal(getAiAssistantSessionHint(null), '请先登录后使用');
assert.equal(getAiAssistantSessionHint({ id: 1 }), '登录后可用');

assert.equal(shouldResetAiAssistantState({ id: 1 }, null), true);
assert.equal(shouldResetAiAssistantState({ id: 1 }, undefined), true);
assert.equal(shouldResetAiAssistantState(null, null), false);
assert.equal(shouldResetAiAssistantState(null, { id: 1 }), false);
