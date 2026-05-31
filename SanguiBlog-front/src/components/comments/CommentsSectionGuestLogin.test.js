import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/components/comments/CommentsSection.jsx'), 'utf8');

assert.match(
    source,
    /const isGuest = !currentUser;/,
    '必须基于 currentUser 定义 guest 状态布尔值'
);

assert.match(
    source,
    /if\s*\(\s*!currentUser\s*\)\s*return\s*;/,
    'handleSubmit 必须在 guest 时直接 return，不调用 onSubmit 也不清空内容'
);

const guestGuardCount = (source.match(/if\s*\(\s*!currentUser\s*\)\s*return\s*;/g) || []).length;
assert.ok(
    guestGuardCount >= 2,
    `main and reply submit handlers should both guard guest submissions, matched ${guestGuardCount}`
);

const disabledCount = (source.match(/disabled=\{isGuest\}/g) || []).length;
assert.ok(
    disabledCount >= 2,
    `textarea 和发布评论按钮都必须对 guest disabled，实际匹配到 ${disabledCount} 处`
);

assert.match(
    source,
    /登录后即可参与评论/,
    'guest 时 placeholder 必须提示需要登录'
);

assert.match(
    source,
    /前往登录/,
    '前往登录入口必须保留'
);

assert.match(
    source,
    /setView\s*&&\s*setView\s*\(\s*'login'\s*\)/,
    'setView(\'login\') 导航必须保留'
);

assert.doesNotMatch(source, /window\.alert\s*\(/);
assert.doesNotMatch(source, /window\.confirm\s*\(/);
