import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/ui/AiAssistantWidget.jsx'), 'utf8');

assert.ok(
    source.includes("rgba(2,6,23,0.78))] backdrop-blur-[18px]"),
    'AI 聊天打开时应提供更明确的页面背景隔离层'
);

assert.ok(
    source.includes("ring-1 ring-white/12 bg-[linear-gradient(180deg,rgba(24,36,60,0.99),rgba(9,14,25,0.985))] text-white backdrop-blur-2xl shadow-[0_36px_120px_rgba(2,6,23,0.68)]"),
    'AI 外壳在暗色模式下应提升与站点背景的层次对比'
);

assert.ok(
    source.includes("sg-scrollbar-dark ring-1 ring-white/12 bg-[linear-gradient(180deg,rgba(2,6,14,0.985),rgba(7,11,20,1))]"),
    'AI 聊天正文区在暗色模式下应与外壳形成更明确的材质区分'
);
