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
    /const\s+\[initialArticleListReady,\s*setInitialArticleListReady\]\s*=\s*useState\(false\)/,
    'HomeView 应区分“已启用 ArticleList”和“初始文章数据已准备好”，避免两套加载态直接切换'
);
assert.match(
    source,
    /const\s+initialArticleQueryRequestedRef\s*=\s*useRef\(false\)/,
    'HomeView 应记录是否已经预取过首页第一页文章，避免 ArticleList 挂载后重复请求'
);
assert.match(
    source,
    /const\s+\[initialArticleQueryRequested,\s*setInitialArticleQueryRequested\]\s*=\s*useState\(false\)/,
    'HomeView 应用 state 暴露是否已预取给渲染层，避免 render 中直接读取 ref.current'
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
    /<StatsStrip\s+isDarkMode=\{isDarkMode\}\s+stats=\{stats\}\s*\/>/,
    '文章区未启用前应复用 StatsStrip 保留系统状态条锚点，CTA 兜底滚动应稳定落到这里'
);
assert.match(
    source,
    /min-h-screen/,
    '文章区未启用前的占位必须至少预留一屏高度，否则页面底部空间不足会导致 CTA 半路停下'
);
assert.doesNotMatch(
    source,
    /Articles Preparing|文章区正在准备中/,
    '文章区未启用前不应再显示临时的 Articles Preparing 卡片，应直接使用文章区加载骨架'
);
assert.match(
    source,
    /import\s+StatsStrip\s+from\s+['"]\.\/StatsStrip\.jsx['"]/,
    '文章区未启用前的占位应复用 System Status 组件，避免和真实文章区视觉割裂'
);
assert.match(
    source,
    /文章搜索[\s\S]*文章加载中…/,
    '文章区未启用前应展示文章搜索与文章加载中的骨架，而不是独立的临时提示卡'
);
assert.match(
    source,
    /const\s+requestInitialArticleList\s*=\s*useCallback/,
    'HomeView 应在切换真实 ArticleList 前先用现有 onQueryChange 预取第一页文章'
);
assert.match(
    source,
    /onQueryChange\(\{\s*page:\s*1,\s*size:\s*pageSize\s*\}\)/,
    'HomeView 首次预取应复用现有文章分页查询参数，不新增第二套接口'
);
assert.match(
    source,
    /const\s+shouldRenderArticleList\s*=\s*articleListEnabled\s*&&\s*initialArticleListReady/,
    'HomeView 应等初始文章数据准备好后再从占位骨架切换到真实 ArticleList，减少加载态二次切换'
);
assert.match(
    source,
    /skipInitialQuery=\{initialArticleQueryRequested\}/,
    'HomeView 预取过第一页后，应通知 ArticleList 跳过首次自动查询，避免第二个加载态'
);
assert.match(
    source,
    /articleListGateRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\);[\s\S]*enableArticleList\(\);/,
    'Hero CTA 应先滚到稳定锚点，再启用文章区，避免懒加载替换目标节点导致滚动半路停止'
);
assert.match(
    source,
    /const\s+heroCtaScrollInProgressRef\s*=\s*useRef\(false\)/,
    'Hero CTA 平滑滚动期间应有保护标记，避免滚动事件立即激活 ArticleList'
);
assert.match(
    source,
    /if\s*\(heroCtaScrollInProgressRef\.current\)\s*return;/,
    '滚动/观察器/空闲预热触发文章区前，应跳过 Hero CTA 正在进行的平滑滚动窗口'
);
assert.match(
    source,
    /window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*heroCtaScrollInProgressRef\.current\s*=\s*false;[\s\S]*enableArticleList\(\);[\s\S]*\},\s*720\)/,
    'Hero CTA 应等平滑滚动稳定后再启用 ArticleList，避免渲染抢占滚动动画'
);
assert.doesNotMatch(
    source,
    /pendingFirstPostScroll|setPendingFirstPostScroll/,
    '文章未加载完成时 CTA 不应再排队二次跳到首篇文章，避免先跳一半再补跳'
);
assert.match(
    source,
    /shouldRenderArticleList\s*\?\s*\(/,
    'ArticleList 应只在文章区启用且初始数据准备好后渲染'
);

console.log('HomeView deferred articles tests passed');
