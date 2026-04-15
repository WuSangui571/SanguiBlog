import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');
const homeRedesignCss = readFileSync(resolve('src/appfull/public/homeRedesign.css'), 'utf8');

assert.match(
    source,
    /className="sg-article-floating-actions hidden md:block fixed left-0 right-0 z-\[65\] pointer-events-none"/,
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

assert.match(
    source,
    /sg-article-floating-button/,
    '文章页 fixed 悬浮按钮应挂载稳定修饰类，避免直接套用大卡片玻璃层造成滚动重绘缝隙'
);

assert.match(
    homeRedesignCss,
    /\.home-ios-card\.sg-article-floating-button::before[\s\S]*display:\s*none;/,
    '文章页 fixed 悬浮按钮应关闭 home-ios-card 的整面伪高光层，避免出现竖向闪块或分界线'
);

assert.match(
    homeRedesignCss,
    /\.home-ios-card\.sg-article-floating-button:hover[\s\S]*transform:\s*none;/,
    '文章页 fixed 悬浮按钮应禁用大卡片 hover 位移，避免与 Framer Motion transform 叠加造成抖动'
);

assert.doesNotMatch(
    source,
    /whileHover=\{\{ scale: 1\.05 \}\}/,
    '文章页 fixed 悬浮按钮不应再叠加 Framer Motion hover 缩放，避免滚动或悬停时触发额外合成层闪块'
);

console.log('ArticleDetail floating buttons tests passed');
