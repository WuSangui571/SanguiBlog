import assert from 'node:assert/strict';

import { buildAiLauncherBadge } from './aiLauncherBadge.js';

const defaultBadge = buildAiLauncherBadge();
assert.equal(defaultBadge.eyebrow, 'AI 助理');
assert.equal(defaultBadge.label, '三桂博客AI助理');

const customBadge = buildAiLauncherBadge({ title: '三桂博客AI助理' });
assert.equal(customBadge.eyebrow, 'AI 助理');
assert.equal(customBadge.label, '三桂博客AI助理');

console.log('aiLauncherBadge tests passed');
