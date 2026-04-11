import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/AppFull.jsx'), 'utf8');

assert.match(
    source,
    /if \(articleState\?\.status === 'error'\) \{[\s\S]*home-ios-card home-ios-card--static/,
    '具体文章页的“文章加载失败”状态应适配为站点玻璃卡片，而不是旧的黑边厚投影容器'
);

assert.match(
    source,
    /文章加载失败[\s\S]*home-ios-inner-card/,
    '文章加载失败状态的错误信息区应落在内层玻璃卡片中，保持和当前站点层级一致'
);

assert.match(
    source,
    /文章加载失败[\s\S]*重试加载[\s\S]*rounded-full/,
    '文章加载失败状态的操作按钮应切换到当前站点的圆角玻璃按钮风格'
);

assert.doesNotMatch(
    source,
    /if \(articleState\?\.status === 'error'\) \{[\s\S]*border-4 border-black shadow-\[12px_12px_0px_0px_#000\]/,
    '文章加载失败状态不应继续使用旧的黑边厚投影卡片'
);

console.log('AppFull article error glass tests passed');
