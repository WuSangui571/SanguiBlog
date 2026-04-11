import assert from 'node:assert/strict';

import { getAiMessagePresentation } from './aiMessagePresentation.js';

const assistantLight = getAiMessagePresentation('assistant', false);
assert.equal(assistantLight.wrapperClassName, 'w-full');
assert.match(assistantLight.contentClassName, /w-full/);
assert.match(assistantLight.contentClassName, /select-text/);
assert.match(assistantLight.contentClassName, /cursor-text/);
assert.doesNotMatch(assistantLight.contentClassName, /rounded-\[/);
assert.doesNotMatch(assistantLight.contentClassName, /\bborder\b/);
assert.doesNotMatch(assistantLight.contentClassName, /\bbg-/);
assert.doesNotMatch(assistantLight.contentClassName, /shadow-/);
assert.doesNotMatch(assistantLight.contentClassName, /backdrop-blur/);

const assistantDark = getAiMessagePresentation('assistant', true);
assert.match(assistantDark.contentClassName, /text-gray-100/);
assert.match(assistantDark.contentClassName, /select-text/);
assert.match(assistantDark.contentClassName, /cursor-text/);
assert.doesNotMatch(assistantDark.contentClassName, /rounded-\[/);
assert.doesNotMatch(assistantDark.contentClassName, /\bborder\b/);
assert.doesNotMatch(assistantDark.contentClassName, /\bbg-/);
assert.doesNotMatch(assistantDark.contentClassName, /shadow-/);
assert.doesNotMatch(assistantDark.contentClassName, /backdrop-blur/);

const userDark = getAiMessagePresentation('user', true);
assert.equal(userDark.wrapperClassName, 'flex justify-end');
assert.match(userDark.contentClassName, /rounded-\[24px\]/);
assert.match(userDark.contentClassName, /backdrop-blur-xl/);
