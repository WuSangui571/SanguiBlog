import assert from 'node:assert/strict';

import { buildAiSessionDeleteDialog } from './aiSessionDeleteDialog.js';

const defaultDialog = buildAiSessionDeleteDialog();
assert.equal(defaultDialog.title, '删除这条对话？');
assert.equal(defaultDialog.sessionTitle, '新对话');
assert.equal(defaultDialog.confirmText, '确认删除');
assert.equal(defaultDialog.cancelText, '取消');

const customDialog = buildAiSessionDeleteDialog('关于 RAG 的测试会话');
assert.equal(customDialog.sessionTitle, '关于 RAG 的测试会话');
assert.match(customDialog.description, /用户侧历史会话中隐藏/);
