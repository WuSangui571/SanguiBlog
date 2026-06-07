import assert from 'node:assert/strict';
import { AI_PENDING_REPLY_INTERVAL_MS, buildAiPendingReplyText } from './aiPendingReply.js';

assert.equal(AI_PENDING_REPLY_INTERVAL_MS, 420);
assert.equal(buildAiPendingReplyText('...', 0), '.');
assert.equal(buildAiPendingReplyText('...', 1), '..');
assert.equal(buildAiPendingReplyText('...', 2), '...');
assert.equal(buildAiPendingReplyText('...', 3), '.');
assert.equal(buildAiPendingReplyText('思考中...', 0), '思考中.');
assert.equal(buildAiPendingReplyText('思考中...', 2), '思考中...');
assert.equal(buildAiPendingReplyText('', 1), '..');
