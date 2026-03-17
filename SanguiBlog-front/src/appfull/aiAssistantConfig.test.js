import assert from 'node:assert/strict';

import { DEFAULT_AI_ASSISTANT_CONFIG, resolveAiAssistantConfig } from './aiAssistantConfig.js';

assert.equal(
    DEFAULT_AI_ASSISTANT_CONFIG.welcomeMessage,
    '你好，我是三桂博客的AI智能助手三桂，有什么可以帮助您的吗？'
);

assert.deepEqual(
    resolveAiAssistantConfig(),
    DEFAULT_AI_ASSISTANT_CONFIG
);

assert.equal(
    resolveAiAssistantConfig({
        welcomeMessage: '欢迎来到三桂博客，我已经准备好了。'
    }).welcomeMessage,
    '欢迎来到三桂博客，我已经准备好了。'
);

assert.equal(
    resolveAiAssistantConfig({
        welcomeMessage: '   '
    }).welcomeMessage,
    DEFAULT_AI_ASSISTANT_CONFIG.welcomeMessage
);
