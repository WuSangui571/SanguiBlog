import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, 'AdminPanel.jsx'), 'utf8');

assert.match(source, /AI 聊天/);
assert.match(source, /RAG 检索/);
assert.match(source, /aiChatAdminEnabled/);
assert.match(source, /aiRagAdminEnabled/);
assert.match(source, /aiChatCapable/);
assert.match(source, /aiRagCapable/);
assert.match(source, /aiChatEffectiveEnabled/);
assert.match(source, /aiRagEffectiveEnabled/);
assert.match(source, /payload\.aiChatAdminEnabled = chatEnabled/);
assert.match(source, /payload\.aiRagAdminEnabled = ragEnabled/);
assert.match(source, /disabled=\{aiAssistantLoading \|\| aiAssistantSaving \|\| !aiChatCapable\}/);
assert.match(source, /disabled=\{aiAssistantLoading \|\| aiAssistantSaving \|\| !aiRagCapable \|\| !aiChatEffectiveEnabled\}/);
