import assert from 'node:assert/strict';

import { shouldShowAiAssistant } from './aiAssistantVisibility.js';

assert.equal(shouldShowAiAssistant('home'), true);
assert.equal(shouldShowAiAssistant('article'), true);
assert.equal(shouldShowAiAssistant('admin'), false);
