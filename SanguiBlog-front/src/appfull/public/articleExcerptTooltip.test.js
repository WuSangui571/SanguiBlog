import assert from 'node:assert/strict';

import {
    getArticleExcerptTooltip,
    isArticleExcerptOverflowing
} from './articleExcerptTooltip.js';

assert.equal(
    getArticleExcerptTooltip('  这是摘要首行。\n\n这是摘要次行。 ', true),
    '这是摘要首行。 这是摘要次行。'
);

assert.equal(getArticleExcerptTooltip('  这是完整显示的摘要。 ', false), '');
assert.equal(getArticleExcerptTooltip('   ', true), '');
assert.equal(getArticleExcerptTooltip(null, true), '');

assert.equal(
    isArticleExcerptOverflowing({
        scrollHeight: 65,
        clientHeight: 64,
        scrollWidth: 100,
        clientWidth: 100
    }),
    false
);

assert.equal(
    isArticleExcerptOverflowing({
        scrollHeight: 67,
        clientHeight: 64,
        scrollWidth: 100,
        clientWidth: 100
    }),
    true
);

assert.equal(
    isArticleExcerptOverflowing({
        scrollHeight: 64,
        clientHeight: 64,
        scrollWidth: 103,
        clientWidth: 100
    }),
    true
);
