import assert from 'node:assert/strict';

import { getAiMessagePresentation } from './aiMessagePresentation.js';

const assistantLight = getAiMessagePresentation('assistant', false);
assert.equal(assistantLight.wrapperClassName, 'w-full');
assert.match(assistantLight.contentClassName, /w-full/);
assert.doesNotMatch(assistantLight.contentClassName, /rounded-\[20px\]/);
assert.doesNotMatch(assistantLight.contentClassName, /bg-\[#FFD700\]/);

const assistantDark = getAiMessagePresentation('assistant', true);
assert.match(assistantDark.contentClassName, /text-gray-100/);

const userDark = getAiMessagePresentation('user', true);
assert.equal(userDark.wrapperClassName, 'flex justify-end');
assert.match(userDark.contentClassName, /rounded-\[20px\]/);
assert.match(userDark.contentClassName, /bg-gray-800/);
