import assert from 'node:assert/strict';
import {
    isAiSelectableTextTarget,
    normalizeSelectedText,
    shouldRaiseAssistantOverlayOnPointerDown
} from './aiSelectionGuard.js';

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

assert.equal(
    shouldRaiseAssistantOverlayOnPointerDown({ button: 0, selectedText: '', selectableTextTarget: true }),
    false,
    '从 AI 消息文本区开始拖选时，即便当前还没有选区，也不应先提升层级打断首次拖选'
);

const selectableTarget = {
    closest(selector) {
        return selector.includes('data-ai-message-selectable') ? { nodeType: 1 } : null;
    }
};
assert.equal(
    isAiSelectableTextTarget(selectableTarget),
    true,
    '应能识别标记为可选中文本的消息区域'
);

const plainTarget = {
    closest() {
        return null;
    }
};
assert.equal(
    isAiSelectableTextTarget(plainTarget),
    false,
    '普通面板空白区域仍应允许点击时提升层级'
);

console.log('AiAssistantSelectionGuard tests passed');
