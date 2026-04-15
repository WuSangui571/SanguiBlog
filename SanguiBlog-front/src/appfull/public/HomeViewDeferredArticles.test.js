import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'HomeView.jsx'), 'utf8');

assert.doesNotMatch(
    source,
    /import\s+ArticleList\s+from\s+['"]\.\/ArticleList\.jsx['"]/,
    '首页文章列表不应继续静态同步引入，应延后到文章区启用时再加载'
);
assert.match(
    source,
    /React\.lazy\(\(\)\s*=>\s*import\(['"]\.\/ArticleList\.jsx['"]\)\)/,
    'HomeView 应使用 React.lazy 拆出 ArticleList，避免首屏同步解析文章区代码'
);
assert.match(
    source,
    /const\s+\[articleListEnabled,\s*setArticleListEnabled\]\s*=\s*useState\(false\)/,
    'HomeView 应维护文章区延迟启用状态'
);
assert.match(
    source,
    /requestIdleCallback/,
    '首页文章区应在首屏动画后通过浏览器空闲时机预热'
);
assert.match(
    source,
    /IntersectionObserver/,
    '首页文章区应在接近视口时提前启用'
);
assert.match(
    source,
    /window\.scrollY\s*>\s*12/,
    '近视口观察不应在首页初始静止状态下过早启用文章区'
);
assert.match(
    source,
    /const\s+handleHeroStartReading\s*=\s*useCallback/,
    'Hero CTA 应复用一个能强制提前启用文章区的处理函数'
);
assert.match(
    source,
    /onStartReading=\{handleHeroStartReading\}/,
    'Hero 不应直接绑定原始滚动函数，否则文章区尚未挂载时 CTA 无法提前启用列表'
);
assert.match(
    source,
    /id="home-deferred-posts-anchor"[\s\S]*ref=\{articleListGateRef\}/,
    '首页应提供一个不随 ArticleList/占位切换而卸载的稳定滚动锚点'
);
assert.match(
    source,
    /id="home-status-strip"/,
    '文章区未启用前应保留系统状态条锚点，CTA 兜底滚动应稳定落到这里'
);
assert.match(
    source,
    /articleListGateRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\);[\s\S]*enableArticleList\(\);/,
    'Hero CTA 应先滚到稳定锚点，再启用文章区，避免懒加载替换目标节点导致滚动半路停止'
);
assert.doesNotMatch(
    source,
    /pendingFirstPostScroll|setPendingFirstPostScroll/,
    '文章未加载完成时 CTA 不应再排队二次跳到首篇文章，避免先跳一半再补跳'
);
assert.match(
    source,
    /articleListEnabled\s*\?\s*\(/,
    'ArticleList 应只在文章区启用后渲染'
);

console.log('HomeView deferred articles tests passed');
