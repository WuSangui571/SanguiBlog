import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const heroSource = fs.readFileSync(path.join(__dirname, 'Hero.jsx'), 'utf8');
const articleListSource = fs.readFileSync(path.join(__dirname, 'ArticleList.jsx'), 'utf8');

assert.match(
    heroSource,
    /window\.matchMedia\('\(max-width: 768px\)'\)\.matches/,
    'Hero 的“向下探索内容”按钮应显式识别手机端视口'
);

assert.match(
    heroSource,
    /document\.getElementById\('home-first-post'\)[\s\S]*?scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\);[\s\S]*?return;/,
    'Hero 在手机端应优先滚到第一篇文章锚点，跳过文章搜索卡片'
);

assert.match(
    heroSource,
    /if \(typeof onStartReading === 'function'\) \{\s*onStartReading\(\);\s*return;\s*\}/,
    'Hero 在非手机端时仍应复用原有 onStartReading 链路，避免改坏桌面端行为'
);

assert.match(
    articleListSource,
    /id=\{idx === 0 \? 'home-first-post' : undefined\}/,
    '文章列表首篇卡片应提供稳定的 home-first-post 锚点，供手机端 Hero 复用'
);

console.log('Hero scroll target tests passed');
