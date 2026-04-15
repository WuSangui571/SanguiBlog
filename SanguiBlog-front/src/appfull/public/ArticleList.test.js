import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'ArticleList.jsx'), 'utf8');

assert.match(source, /className="flex w-\[72px\] shrink-0 justify-end"/);
assert.match(source, /opacity-0 pointer-events-none/);
assert.match(source, /className="flex flex-row md:flex-row min-h-\[360px\]"/);
assert.doesNotMatch(source, /className="flex flex-col md:flex-row min-h-\[360px\]"/);
assert.match(source, /className="w-\[38%\] md:w-1\/3 shrink-0 h-auto md:h-auto md:min-h-\[360px\] md:max-h-\[360px\] border-b-0 border-r-2 md:border-b-0 md:border-r-2 border-black relative overflow-hidden group"/);
assert.match(source, /className=\{`flex-1 min-w-0 p-4 md:p-8 \$\{cardBg\} group \$\{hoverBg\} flex flex-col rounded-r-\[24px\]`\}/);
assert.match(source, /className=\{`text-xl md:text-3xl font-black flex-1 transition-colors group-hover:text-\[var\(--title-color\)\] \$\{text\}`\}/);
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
