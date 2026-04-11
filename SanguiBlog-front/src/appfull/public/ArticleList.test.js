import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'ArticleList.jsx'), 'utf8');

assert.match(source, /className="flex w-\[72px\] shrink-0 justify-end"/);
assert.match(source, /opacity-0 pointer-events-none/);
assert.doesNotMatch(source, /\{keyword && \(/);
assert.match(source, /最新评论/);
assert.match(source, /home-ios-card--static p-5/);
assert.match(source, /transition-transform duration-200 hover:-translate-y-0\.5/);
assert.match(source, /placeholder="请输入关键词搜索"/);
assert.doesNotMatch(source, /输入关键词后按回车搜索（标题\/摘要模糊匹配）/);

const authorCardIndex = source.indexOf('home-ios-card--overflow-visible p-6 text-center relative');
assert.notEqual(authorCardIndex, -1, '首页侧栏博主信息卡片应保留头像外溢容器类');
assert.match(
    source.slice(Math.max(0, authorCardIndex - 120), authorCardIndex + 120),
    /home-ios-card--static home-ios-card--overflow-visible p-6 text-center relative/,
    '首页博主信息外层卡片应禁用 hover 上浮，但保留头像外溢效果'
);

const tagsHeadingIndex = source.indexOf('全部标签');
assert.notEqual(tagsHeadingIndex, -1, '首页侧栏应继续渲染全部标签卡片');
const tagsCardStart = source.lastIndexOf('<div className={`', tagsHeadingIndex);
assert.notEqual(tagsCardStart, -1, '应能定位全部标签外层卡片');
assert.match(
    source.slice(tagsCardStart, tagsHeadingIndex),
    /\$\{sidebarBg\} \$\{glassSurface\} home-ios-card--static p-5/,
    '首页全部标签外层卡片应禁用 hover 上浮'
);

const tagChipIndex = source.indexOf('home-ios-chip ${isActive ?');
assert.notEqual(tagChipIndex, -1, '首页全部标签内部的具体标签 chip 应继续存在');
assert.match(
    source.slice(Math.max(0, tagChipIndex - 120), tagChipIndex + 120),
    /transition-transform hover:-translate-y-0\.5[\s\S]*home-ios-chip/,
    '首页全部标签内部的具体标签 chip 应保留 hover 上浮效果'
);

console.log('ArticleList tests passed');
