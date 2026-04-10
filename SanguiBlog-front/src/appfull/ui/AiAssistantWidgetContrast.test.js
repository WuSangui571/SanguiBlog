import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/ui/AiAssistantWidget.jsx'), 'utf8');

assert.match(
    source,
    /const assistantBackdropClass = isDarkMode[\s\S]*backdrop-blur-\[10px\][\s\S]*bg-\[radial-gradient/,
    'AI 聊天打开时应提供带模糊和渐变衬底的页面背景隔离层'
);

assert.match(
    source,
    /const shellClass = isDarkMode[\s\S]*shadow-\[0_28px_80px_rgba\(2,6,23,0\.46\)\]/,
    'AI 外壳在暗色模式下应提升与站点背景的层次对比'
);

assert.match(
    source,
    /const viewportGlassClass = isDarkMode[\s\S]*ring-1[\s\S]*bg-\[linear-gradient\(180deg,rgba\(7,12,24,0\.92\),rgba\(10,17,31,0\.98\)\)\]/,
    'AI 聊天正文区在暗色模式下应与外壳形成更明确的材质区分'
);
