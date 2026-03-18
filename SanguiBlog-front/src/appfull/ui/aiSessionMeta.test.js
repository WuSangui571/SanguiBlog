import assert from 'node:assert/strict';

import { formatAiSessionTimeLabel, truncateAiSessionTitle } from './aiSessionMeta.js';

const now = new Date('2026-03-18T12:00:00');

assert.equal(formatAiSessionTimeLabel('2026-03-18T11:55:00', now), '5分钟前');
assert.equal(formatAiSessionTimeLabel('2026-03-18T09:00:00', now), '3小时前');
assert.equal(formatAiSessionTimeLabel('2026-03-17T20:00:00', now), '昨天');
assert.equal(formatAiSessionTimeLabel('2026-03-15T12:00:00', now), '7天内');
assert.equal(formatAiSessionTimeLabel('2026-03-01T12:00:00', now), '30天内');
assert.equal(formatAiSessionTimeLabel('2026-02-01T12:00:00', now), '一个月前');

assert.equal(truncateAiSessionTitle('第一次提问的内容很长很长很长', 8), '第一次提问的内容...');
assert.equal(truncateAiSessionTitle('简短问题', 8), '简短问题');
assert.equal(truncateAiSessionTitle('', 8), '新对话');
