import assert from 'node:assert/strict';
import {
  buildRedirectSourceMeta,
  resolveRedirectSourceMeta,
  REDIRECT_SOURCE_QUERY_KEYS,
} from './analyticsReferrer.js';

assert.deepEqual(REDIRECT_SOURCE_QUERY_KEYS, ['sg_redirect_from', 'redirect_from']);

assert.deepEqual(buildRedirectSourceMeta('old.example.com', 'https://sangui.top'), {
  referrer: 'https://old.example.com/',
  sourceLabel: '来自重定向：old.example.com',
});

assert.deepEqual(buildRedirectSourceMeta('https://old.example.com/blog?a=1', 'https://sangui.top'), {
  referrer: 'https://old.example.com/blog?a=1',
  sourceLabel: '来自重定向：old.example.com',
});

assert.equal(buildRedirectSourceMeta('sangui.top', 'https://sangui.top'), null);
assert.equal(buildRedirectSourceMeta('', 'https://sangui.top'), null);

assert.deepEqual(resolveRedirectSourceMeta('?foo=1&sg_redirect_from=legacy.example.com', 'https://sangui.top'), {
  referrer: 'https://legacy.example.com/',
  sourceLabel: '来自重定向：legacy.example.com',
});

assert.deepEqual(resolveRedirectSourceMeta('?redirect_from=https%3A%2F%2Fold.example.com%2Fpost%2F1', 'https://sangui.top'), {
  referrer: 'https://old.example.com/post/1',
  sourceLabel: '来自重定向：old.example.com',
});

assert.deepEqual(resolveRedirectSourceMeta('?sg_redirect_from=spoof.example.com&sg_redirect_from=legacy.example.com', 'https://sangui.top'), {
  referrer: 'https://legacy.example.com/',
  sourceLabel: '来自重定向：legacy.example.com',
});

console.log('analytics redirect referrer tests passed');
