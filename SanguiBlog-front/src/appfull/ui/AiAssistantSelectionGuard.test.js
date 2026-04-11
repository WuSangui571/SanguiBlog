import assert from 'node:assert/strict';
import { normalizeSelectedText, shouldRaiseAssistantOverlayOnPointerDown } from './aiSelectionGuard.js';

assert.equal(normalizeSelectedText('  已选中的文字  '), '已选中的文字');
assert.equal(normalizeSelectedText('   '), '');
assert.equal(normalizeSelectedText(null), '');

assert.equal(
    shouldRaiseAssistantOverlayOnPointerDown({ button: 0, selectedText: '' }),
    true,
    '普通左键点击且没有选中文本时，仍应允许提升 AI 面板层级'
);

assert.equal(
    shouldRaiseAssistantOverlayOnPointerDown({ button: 2, selectedText: '已选中的助手回复' }),
    false,
    '右键点击选中文本时，不应再触发层级提升导致选区丢失'
);

assert.equal(
    shouldRaiseAssistantOverlayOnPointerDown({ button: 0, selectedText: '已选中的助手回复' }),
    false,
    '文本已经处于选中状态时，不应通过捕获阶段刷新层级打断选区'
);

console.log('AiAssistantSelectionGuard tests passed');
