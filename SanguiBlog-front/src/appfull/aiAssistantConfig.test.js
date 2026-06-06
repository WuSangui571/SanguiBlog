import assert from 'node:assert/strict';

import { DEFAULT_AI_ASSISTANT_CONFIG, resolveAiAssistantConfig } from './aiAssistantConfig.js';

assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.enabled, true);
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.capable, true);
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.ragEnabled, false);
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.ragCapable, false);
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.disabledReason, null);
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.ragDisabledReason, null);
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.welcomeMessage, '你好，我是三桂博客AI助理');
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.title, '三桂博客AI助理');
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.logoPath, '/static/ai/assistant-logo.png');
assert.equal(DEFAULT_AI_ASSISTANT_CONFIG.pendingReply, '...');

assert.deepEqual(resolveAiAssistantConfig(), DEFAULT_AI_ASSISTANT_CONFIG);

assert.equal(
    resolveAiAssistantConfig({
        enabled: false,
        welcomeMessage: '欢迎来到三桂博客，我已经准备好了。'
    }).enabled,
    false
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

// new fields: tolerate missing
assert.equal(resolveAiAssistantConfig({}).capable, true);
assert.equal(resolveAiAssistantConfig({}).ragEnabled, false);
assert.equal(resolveAiAssistantConfig({}).ragCapable, false);
assert.equal(resolveAiAssistantConfig({}).disabledReason, null);
assert.equal(resolveAiAssistantConfig({}).ragDisabledReason, null);

// new fields: explicit overrides
assert.equal(resolveAiAssistantConfig({ capable: false }).capable, false);
assert.equal(resolveAiAssistantConfig({ ragEnabled: true }).ragEnabled, true);
assert.equal(resolveAiAssistantConfig({ ragCapable: true }).ragCapable, true);
assert.equal(resolveAiAssistantConfig({ disabledReason: 'missing api key' }).disabledReason, 'missing api key');
assert.equal(resolveAiAssistantConfig({ ragDisabledReason: 'no embedding' }).ragDisabledReason, 'no embedding');

// new fields: safe defaults for non-boolean
assert.equal(resolveAiAssistantConfig({ capable: 'yes' }).capable, true);
assert.equal(resolveAiAssistantConfig({ ragEnabled: 1 }).ragEnabled, false);
assert.equal(resolveAiAssistantConfig({ disabledReason: '' }).disabledReason, null);
assert.equal(resolveAiAssistantConfig({ ragDisabledReason: null }).ragDisabledReason, null);
