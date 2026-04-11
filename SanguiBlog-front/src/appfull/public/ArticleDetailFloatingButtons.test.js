import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');

assert.match(
    source,
    /className="hidden md:block fixed left-0 right-0 z-\[65\] pointer-events-none"/,
    '文章详情页的“首页/评论”悬浮按钮容器应仅在 md 及以上视口显示，手机端直接隐藏'
);

assert.match(
    source,
    /hidden xl:block fixed z-40/,
    '桌面端目录卡片应继续保留，不受手机端目录入口移除影响'
);

assert.doesNotMatch(
    source,
    /aria-label="打开目录"/,
    '手机端不应再显示目录按钮'
);

assert.doesNotMatch(
    source,
    /aria-label="文章目录"/,
    '手机端不应再渲染目录抽屉'
);

console.log('ArticleDetail floating buttons tests passed');
