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
    /aria-label="打开目录"/,
    '手机端仍应保留目录入口，避免隐藏悬浮按钮后失去文章内导航'
);

console.log('ArticleDetail floating buttons tests passed');
