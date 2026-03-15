import assert from 'node:assert/strict';

import { shouldShowInlineImageUpload } from './createPostInlineImageVisibility.js';

assert.equal(shouldShowInlineImageUpload(0), false);
assert.equal(shouldShowInlineImageUpload(1), true);
assert.equal(shouldShowInlineImageUpload(3), true);
assert.equal(shouldShowInlineImageUpload(-1), false);
assert.equal(shouldShowInlineImageUpload(Number.NaN), false);
