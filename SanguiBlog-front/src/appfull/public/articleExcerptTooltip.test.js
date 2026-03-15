import assert from 'node:assert/strict';

import { getArticleExcerptTooltip } from './articleExcerptTooltip.js';

assert.equal(
    getArticleExcerptTooltip('  这是摘要首行。\n\n这是摘要次行。  '),
    '这是摘要首行。 这是摘要次行。'
);

assert.equal(getArticleExcerptTooltip('   '), '');
assert.equal(getArticleExcerptTooltip(null), '');
