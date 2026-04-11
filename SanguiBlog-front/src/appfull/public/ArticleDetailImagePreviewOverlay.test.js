import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const articleDetailSource = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');
const aiWidgetSource = readFileSync(resolve('src/appfull/ui/AiAssistantWidget.jsx'), 'utf8');
const globalCssSource = readFileSync(resolve('src/index.css'), 'utf8');

assert.match(
    articleDetailSource,
    /document\.documentElement\.classList\.add\('sg-article-image-preview-open'\)/,
    '文章图片大图预览打开时，应给 html 节点挂上专用状态类，用于收起滚动条预留区并统一处理浮层遮挡'
);

assert.match(
    articleDetailSource,
    /document\.body\.classList\.add\('sg-article-image-preview-open'\)/,
    '文章图片大图预览打开时，应给 body 节点挂上专用状态类，用于统一屏蔽页面浮动入口'
);

assert.match(
    articleDetailSource,
    /sg-article-floating-actions/,
    '文章页“首页\/评论”悬浮按钮容器应暴露稳定类名，便于在大图预览打开时统一隐藏并禁点'
);

assert.match(
    articleDetailSource,
    /className="fixed inset-0 z-\[220\] bg-black\/90 flex items-center justify-center p-0"/,
    '文章图片大图预览层应抬升到足够高的层级，避免再次被页面其它 portal 浮层压住'
);

assert.match(
    aiWidgetSource,
    /className="sg-ai-assistant-layer"/,
    'AI 助手 portal 根层应暴露稳定类名，便于在文章大图预览打开时整体隐藏并禁点'
);

assert.match(
    globalCssSource,
    /\.sg-article-image-preview-open\s*\{\s*scrollbar-gutter:\s*auto;/,
    '图片大图预览打开时，应取消全局稳定滚动条预留槽位，避免右侧出现白线'
);

assert.match(
    globalCssSource,
    /\.sg-article-image-preview-open\s+\.sg-ai-assistant-layer[\s\S]*pointer-events:\s*none;/,
    '图片大图预览打开时，AI 助手层应整体不可点击'
);

assert.match(
    globalCssSource,
    /\.sg-article-image-preview-open\s+\.sg-article-floating-actions[\s\S]*pointer-events:\s*none;/,
    '图片大图预览打开时，文章页悬浮按钮层应整体不可点击'
);

console.log('ArticleDetail image preview overlay tests passed');
